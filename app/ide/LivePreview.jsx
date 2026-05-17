

export default function LivePreview({ memeUrl, memeLoading, quote, quoteLoading, networkLog, showLog }) {
  return (
    <div className="ide-panel-content">
      <div className="ide-api-section">
        <div className="ide-api-label">
          GET MEME-API.AELX.DE/GIMME
          <span className={`ide-api-status ${memeUrl ? 'ok' : 'err'}`}>{memeUrl ? '200' : 'ERR'}</span>
        </div>
        <div className="ide-preview-meme">
          {memeLoading ? (
            <div className="ide-skeleton" style={{ width: '100%', height: 140 }} />
          ) : memeUrl ? (
            <img src={memeUrl} alt="meme" style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ color: '#6c7086', fontSize: 11, fontFamily: 'monospace', padding: 12 }}>null</div>
          )}
        </div>
      </div>
      <div className="ide-api-section">
        <div className="ide-api-label">
          GET QUOTES.AELX.DE/RANDOM
          <span className={`ide-api-status ${quote ? 'ok' : 'err'}`}>{quote ? '200' : 'ERR'}</span>
        </div>
        <div className="ide-terminal-block">
          <div className="ide-terminal-prompt">$ fortune</div>
          {quoteLoading ? (
            <>
              <div className="ide-skeleton" style={{ height: 12, marginTop: 6 }} />
              <div className="ide-skeleton" style={{ height: 12, marginTop: 4, width: '70%' }} />
            </>
          ) : (
            <>
              <div className="ide-terminal-quote">{quote?.content}</div>
              <div className="ide-terminal-author"># — {quote?.author || 'Unknown'}</div>
            </>
          )}
        </div>
      </div>
      {showLog && (
        <div className="ide-network-section">
          <div className="ide-network-header">
            Network
            <div className="ide-network-live"><span className="ide-live-dot" />live</div>
            <span className="ide-network-count">{networkLog.length}</span>
          </div>
          {networkLog.length === 0 ? (
            <div style={{ color: '#45475a', fontSize: 10, fontFamily: 'monospace', padding: '4px 0' }}>— awaiting requests</div>
          ) : networkLog.map((entry, i) => (
            <div key={i} className="ide-network-entry">
              <span className={`ide-net-status ${entry.ok ? 'ok' : 'err'}`}>{entry.ok ? '200' : 'ERR'}</span>
              <span className="ide-net-url">{entry.url}</span>
              <span className="ide-net-ms">{entry.ms}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
