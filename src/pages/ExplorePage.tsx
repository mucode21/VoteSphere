import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getElections, Election, CONTRACT_REGISTRY_ID } from '../services/stellar';

interface ExplorePageProps {
  onNavigate: (page: string, params?: any) => void;
}

const ExplorePage = ({ onNavigate }: ExplorePageProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'closed'>('all');

  const { data: elections = [], isLoading, error } = useQuery({
    queryKey: ['elections'],
    queryFn: getElections
  });

  const categories = ['All', 'DAO', 'Protocol', 'Corporate'];

  const filteredElections = elections.filter((e: Election) => {
    // 1. Search term match
    const matchesSearch = 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Status match
    const matchesStatus = 
      activeStatus === 'all' || 
      (activeStatus === 'active' && !e.closed) ||
      (activeStatus === 'closed' && e.closed);

    // 3. Category match (deterministic category based on election ID to keep it rich)
    const category = e.id % 3 === 0 ? 'Protocol' : e.id % 3 === 1 ? 'DAO' : 'Corporate';
    const matchesCategory = activeCategory === 'All' || category === activeCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-8 md:py-16">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="font-display-lg text-display-lg text-primary mb-2">On-Chain Governance</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Participate in shaping the future. Browse ongoing governance proposals and cast your vote on-chain.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low border-b border-outline focus:border-b-2 focus:border-primary focus:ring-0 pl-10 pr-4 py-2 font-body-md text-body-md text-on-surface placeholder:text-outline outline-none transition-colors"
              placeholder="Search proposals..."
            />
          </div>
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`font-label-sm text-label-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/50 hover:bg-surface-container'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex border-b border-outline-variant/30 mb-8 gap-6">
        <button
          onClick={() => setActiveStatus('all')}
          className={`pb-3 font-label-md text-label-md uppercase tracking-wider ${
            activeStatus === 'all' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          All Proposals ({elections.length})
        </button>
        <button
          onClick={() => setActiveStatus('active')}
          className={`pb-3 font-label-md text-label-md uppercase tracking-wider ${
            activeStatus === 'active' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Active ({elections.filter(e => !e.closed).length})
        </button>
        <button
          onClick={() => setActiveStatus('closed')}
          className={`pb-3 font-label-md text-label-md uppercase tracking-wider ${
            activeStatus === 'closed' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Closed ({elections.filter(e => e.closed).length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 text-center">
          <span className="material-symbols-outlined text-primary text-5xl animate-spin mb-4">sync</span>
          <p className="font-headline-sm text-headline-sm">Simulating ledger query...</p>
        </div>
      ) : error ? (
        <div className="bg-error-container text-on-error-container p-6 rounded-xl text-center">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <h3 className="font-headline-sm text-headline-sm mb-1">Failed to query registry</h3>
          <p className="font-body-md text-body-md">Make sure Soroban Testnet network RPC is reachable.</p>
        </div>
      ) : filteredElections.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-12 text-center flex flex-col items-center">
          <span className="material-symbols-outlined text-outline text-5xl mb-4">ballot</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">No matching elections found</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Try resetting your search or category filter. If no elections exist, head to the wizard to create one!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {filteredElections.map((election, index) => {
            const category = election.id % 3 === 0 ? 'Protocol' : election.id % 3 === 1 ? 'DAO' : 'Corporate';
            
            // Render first item as a featured span-8 bento card if all statuses shown
            const isFeatured = index === 0 && activeStatus === 'all' && activeCategory === 'All';
            
            if (isFeatured) {
              return (
                <article key={election.id} className="md:col-span-8 bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-surface-container-lowest to-surface-container-low opacity-50 z-0"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm px-3 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">account_balance</span> {category}
                      </span>
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined">timer</span>
                        <span className="font-label-md text-label-md">
                          {election.closed ? 'Closed' : `Ends: ${new Date(election.end_time * 1000).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface mb-4 group-hover:text-primary transition-colors">
                      {election.title}
                    </h2>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-8 max-w-xl line-clamp-3">
                      {election.description}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div>
                        <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Status</p>
                        <p className="font-label-md text-label-md text-on-surface flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full inline-block ${election.closed ? 'bg-error' : 'bg-primary'}`}></span>
                          {election.closed ? 'Closed' : 'Active'}
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Candidates</p>
                        <p className="font-label-md text-label-md text-on-surface">{election.candidates.length}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Contract Registry</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant font-mono text-xs truncate">
                          {CONTRACT_REGISTRY_ID}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 border-t border-outline-variant/30 pt-6 flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">ID: #{election.id}</span>
                    <button
                      onClick={() => onNavigate('details', { id: election.id })}
                      className="bg-primary text-on-primary font-label-md text-label-md uppercase px-6 py-3 hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {election.closed ? 'View Results' : 'Review & Vote'}
                    </button>
                  </div>
                </article>
              );
            }

            // Normal cards (span-4)
            return (
              <article key={election.id} className="md:col-span-4 bg-surface-container-lowest border border-outline-variant/30 p-6 flex flex-col justify-between hover:border-primary/50 transition-colors rounded-lg">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`font-label-sm text-label-sm px-3 py-1 rounded-full ${
                      category === 'DAO' ? 'bg-secondary-fixed text-on-secondary-fixed' :
                      category === 'Protocol' ? 'bg-tertiary-fixed text-on-tertiary-fixed' :
                      'bg-surface-variant text-on-surface-variant'
                    }`}>{category}</span>
                    <span className="font-label-sm text-label-sm text-outline">
                      {election.closed ? 'Ended' : 'Active'}
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3 line-clamp-2">{election.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 text-sm line-clamp-3">{election.description}</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-label-sm text-label-sm text-outline">Candidates</span>
                    <span className="font-label-md text-label-md text-on-surface">{election.candidates.length} Options</span>
                  </div>
                  <div className="w-full bg-surface-variant rounded-full h-1 mb-6">
                    <div className={`h-1 rounded-full ${election.closed ? 'bg-error' : 'bg-secondary'}`} style={{ width: election.closed ? '100%' : '50%' }}></div>
                  </div>
                  <button
                    onClick={() => onNavigate('details', { id: election.id })}
                    className="w-full border border-primary text-primary hover:bg-primary/5 font-label-md text-label-md uppercase py-2 transition-colors"
                  >
                    {election.closed ? 'View Results' : 'View Details'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
