import React from 'react';

/**
 * A component to display the aggregated market sentiment scores.
 * @param {object} props - The component props.
 * @param {object} props.sentiment - The sentiment data object.
 * @param {number} props.sentiment.positive - The positive sentiment score (0-1).
 * @param {number} props.sentiment.neutral - The neutral sentiment score (0-1).
 * @param {number} props.sentiment.negative - The negative sentiment score (0-1).
 * @param {number} props.sentiment.post_count - The number of posts analyzed.
 */
const SentimentOverview = ({ sentiment }) => {
  // Render nothing if sentiment data is not available
  if (!sentiment || sentiment.post_count === 0) {
    return null;
  }

  return (
    <div className="sentiment-overview">
      <h3>Market Sentiment</h3>
      <div className="sentiment-stats">
        <div className="sentiment-item positive">
          <span className="sentiment-label">Positive</span>
          <span className="sentiment-value">
            {(sentiment.positive * 100).toFixed(1)}%
          </span>
        </div>
        <div className="sentiment-item neutral">
          <span className="sentiment-label">Neutral</span>
          <span className="sentiment-value">
            {(sentiment.neutral * 100).toFixed(1)}%
          </span>
        </div>
        <div className="sentiment-item negative">
          <span className="sentiment-label">Negative</span>
          <span className="sentiment-value">
            {(sentiment.negative * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      {sentiment.post_count > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '1rem' }}>
          Based on {sentiment.post_count} recent posts.
        </p>
      )}
    </div>
  );
};

export default SentimentOverview;