import { useState, useEffect } from 'react';
import { useStore } from '../state/store';
import { useToast } from '../context/ToastContext';
import Button from './Button';

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('General Feedback');
  const [comments, setComments] = useState('');
  const { addFeedback, feedbackList } = useStore();
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      toast.warning('Please enter some comments/suggestions.');
      return;
    }
    addFeedback(rating, category, comments.trim());
    toast.success('Thank you! Your feedback has been recorded locally.');
    setComments('');
    setRating(5);
    setCategory('General Feedback');
    setIsOpen(false);
  };

  const exportFeedbackJSON = () => {
    if (feedbackList.length === 0) {
      toast.info('No feedback items to export yet.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(feedbackList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `votesphere_feedback_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportFeedbackCSV = () => {
    if (feedbackList.length === 0) {
      toast.info('No feedback items to export yet.');
      return;
    }
    const headers = ['Feedback ID', 'Rating', 'Category', 'Comments', 'Timestamp'];
    const rows = feedbackList.map(item => [
      item.id,
      item.rating.toString(),
      `"${item.category.replace(/"/g, '""')}"`,
      `"${item.comments.replace(/"/g, '""')}"`,
      item.timestamp
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `votesphere_feedback_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary/95 text-on-primary w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 focus:outline-none"
        aria-label="Submit Feedback"
      >
        <span className="material-symbols-outlined block">rate_review</span>
      </button>

      {/* Feedback Dialog */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div className="vellum-card max-w-md w-full p-6 rounded-lg border border-outline-variant shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 focus:outline-none"
              aria-label="Close feedback panel"
            >
              <span className="material-symbols-outlined block text-xl">close</span>
            </button>

            <h2 id="feedback-title" className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">rate_review</span>
              Feedback & Rating
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full input-ledger text-body-md focus:outline-none bg-transparent"
                >
                  <option value="General Feedback">General Feedback</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="UI Improvement">UI/UX Suggestion</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-colors focus:outline-none ${star <= rating ? 'text-primary' : 'text-outline-variant'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Suggestions</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="w-full input-ledger text-body-md focus:outline-none bg-transparent"
                  placeholder="Share details, errors, suggestions, or ideas..."
                />
              </div>

              <div className="pt-2 flex justify-between gap-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={exportFeedbackJSON}
                    className="p-2 text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 focus:outline-none"
                    title="Export JSON"
                  >
                    <span className="material-symbols-outlined text-sm">download</span> JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportFeedbackCSV}
                    className="p-2 text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 focus:outline-none"
                    title="Export CSV"
                  >
                    <span className="material-symbols-outlined text-sm">download</span> CSV
                  </button>
                </div>
                <Button
                  type="submit"
                  className="btn-primary px-4 py-2 font-label-sm text-label-sm uppercase rounded focus:outline-none"
                >
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
