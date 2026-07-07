import {
  rpcServer,
  CONTRACT_REGISTRY_ID,
  CONTRACT_VOTING_ID,
  CONTRACT_RESULTS_ID
} from './stellar';
import { scValToNative } from '@stellar/stellar-sdk';
import { monitoring } from './monitoring/monitoring-service';

export interface ContractEvent {
  id: string;
  contractId: string;
  type: 'election_created' | 'election_updated' | 'election_closed' | 'vote_cast' | 'results_updated' | 'results_finalized';
  data: any;
  ledger: number;
}

type EventCallback = (event: ContractEvent) => void;

class EventStreamService {
  private listeners: Set<EventCallback> = new Set();
  private polling = false;
  private lastLedger = 0;
  private timeoutId: any = null;
  private processedEventIds: Set<string> = new Set();
  
  // Resiliency and backoff config
  private consecutiveFailures = 0;
  private baseDelay = 4000;
  private maxDelay = 60000;
  private currentDelay = 4000;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const ledgerInfo = await rpcServer.getLatestLedger();
      this.lastLedger = ledgerInfo.sequence - 5; // Start 5 ledgers back to capture recent events
      this.consecutiveFailures = 0;
      this.currentDelay = this.baseDelay;
    } catch (e) {
      this.consecutiveFailures++;
      monitoring.logError(e, { context: 'EventStream init', consecutiveFailures: this.consecutiveFailures });
      console.error('Failed to get latest ledger:', e);
      this.lastLedger = 0;
    }
  }

  public subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    this.startPolling();
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling() {
    if (this.polling) return;
    this.polling = true;
    this.poll();
  }

  private async poll() {
    if (!this.polling) return;

    if (this.lastLedger === 0) {
      await this.init();
      if (this.lastLedger === 0) {
        // If still failed, schedule next try with backoff
        this.consecutiveFailures++;
        this.currentDelay = Math.min(this.baseDelay * Math.pow(2, this.consecutiveFailures), this.maxDelay);
        this.timeoutId = setTimeout(() => this.poll(), this.currentDelay);
        return;
      }
    }

    try {
      const eventsResponse = await rpcServer.getEvents({
        startLedger: this.lastLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [CONTRACT_REGISTRY_ID, CONTRACT_VOTING_ID, CONTRACT_RESULTS_ID]
          }
        ],
        limit: 100
      });

      // Reset backoff on successful request
      this.consecutiveFailures = 0;
      this.currentDelay = this.baseDelay;

      if (eventsResponse.events && eventsResponse.events.length > 0) {
        // Sort events by ledger/id
        const sortedEvents = eventsResponse.events.sort((a, b) => a.ledger - b.ledger);
        
        for (const ev of sortedEvents) {
          if (this.processedEventIds.has(ev.id)) {
            continue;
          }
          this.processedEventIds.add(ev.id);
          
          // Limit memory usage
          if (this.processedEventIds.size > 1000) {
            const firstKey = this.processedEventIds.keys().next().value;
            if (firstKey) this.processedEventIds.delete(firstKey);
          }

          const parsed = this.parseEvent(ev);
          if (parsed) {
            this.notify(parsed);
          }
          if (ev.ledger >= this.lastLedger) {
            this.lastLedger = ev.ledger;
          }
        }
      }
    } catch (err) {
      this.consecutiveFailures++;
      this.currentDelay = Math.min(this.baseDelay * Math.pow(2, this.consecutiveFailures), this.maxDelay);
      
      monitoring.logError(err, {
        context: 'EventStream poll',
        consecutiveFailures: this.consecutiveFailures,
        nextRetryDelay: this.currentDelay
      });
      console.error(`Error polling contract events (attempt ${this.consecutiveFailures}, retrying in ${this.currentDelay}ms):`, err);
    }

    // Schedule next poll execution
    this.timeoutId = setTimeout(() => this.poll(), this.currentDelay);
  }

  private stopPolling() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.polling = false;
  }

  private parseEvent(event: any): ContractEvent | null {
    try {
      const topics = event.topic || [];
      if (topics.length < 2) return null;

      const category = scValToNative(topics[0]).toString();
      const name = scValToNative(topics[1]).toString();
      const rawData = scValToNative(event.value);

      let type: ContractEvent['type'] | null = null;
      let data: any = {};

      if (category === 'registry' && name === 'election_created') {
        type = 'election_created';
        data = {
          id: Number(rawData[0]),
          title: rawData[1].toString()
        };
      } else if (category === 'registry' && name === 'election_updated') {
        type = 'election_updated';
        data = {
          id: Number(rawData[0]),
          title: rawData[1].toString()
        };
      } else if (category === 'registry' && name === 'election_closed') {
        type = 'election_closed';
        data = {
          id: Number(rawData)
        };
      } else if (category === 'voting' && name === 'vote_cast') {
        type = 'vote_cast';
        data = {
          electionId: Number(rawData[0]),
          voter: rawData[1].toString(),
          candidateIdx: Number(rawData[2])
        };
      } else if (category === 'results' && name === 'result_calculated') {
        type = 'results_updated';
        data = {
          electionId: Number(rawData[0]),
          winnerIdx: Number(rawData[1]),
          maxVotes: Number(rawData[2])
        };
      } else if (category === 'results' && name === 'finalized') {
        type = 'results_finalized';
        data = {
          electionId: Number(rawData)
        };
      }

      if (type) {
        return {
          id: event.id,
          contractId: event.contractId,
          type,
          data,
          ledger: event.ledger
        };
      }
    } catch (e) {
      monitoring.logError(e, { context: 'EventStream parseEvent', rawEvent: event });
      console.error('Error parsing event:', e);
    }
    return null;
  }

  private notify(event: ContractEvent) {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (err) {
        monitoring.logError(err, { context: 'EventStream listener notify' });
        console.error('Listener callback error:', err);
      }
    });
  }
}

export const eventStreamService = new EventStreamService();
export const eventLedgerFeed: ContractEvent[] = [];

// Track global list of recent events
eventStreamService.subscribe((event) => {
  eventLedgerFeed.unshift(event);
  if (eventLedgerFeed.length > 50) {
    eventLedgerFeed.pop();
  }
});
