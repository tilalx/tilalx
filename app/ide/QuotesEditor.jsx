'use client'

import { LineNumbers } from './CodeViewer'

export default function QuotesEditor({ quote, loading, onNext }) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)
  return (
    <div className="ide-editor-scroll">
      <LineNumbers count={60} />
      <div className="ide-editor-body">
        <div className="ide-quotes-editor">
          <div className="ide-quotes-log-line">
            <span className="ts">{ts}</span>
            <span className="level">INFO</span>
            <span className="msg">quotes.log — random quotes from quotes.aelx.de</span>
          </div>
          <div className="ide-quotes-log-line" style={{ marginBottom: 16 }}>
            <span className="ts">{ts}</span>
            <span className="level" style={{ color: '#89b4fa' }}>GET</span>
            <span className="msg" style={{ color: '#6c7086' }}>https://quotes.aelx.de/random?count=1</span>
          </div>
          <div className="ide-fortune-block">
            <div className="ide-fortune-prompt">$ fortune</div>
            {loading ? (
              <>
                <div className="ide-skeleton" style={{ height: 14, marginTop: 8 }} />
                <div className="ide-skeleton" style={{ height: 14, marginTop: 6, width: '72%' }} />
              </>
            ) : (
              <>
                <div className="ide-fortune-text">{quote?.content}</div>
                <div className="ide-fortune-author"># — {quote?.author || 'Unknown'}</div>
                {quote?.tags?.length > 0 && (
                  <div className="ide-fortune-tags">
                    {quote.tags.map(tag => <span key={tag} className="ide-fortune-tag">{tag}</span>)}
                  </div>
                )}
              </>
            )}
          </div>
          <button className="ide-quotes-next-btn" onClick={onNext} disabled={loading}>
            {loading ? 'loading...' : '$ fortune  # next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
