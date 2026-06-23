import React, { useState } from 'react';
import { 
  Briefcase, 
  Award, 
  Sparkles, 
  Plus, 
  XCircle, 
  ExternalLink, 
  User, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle,
  Send,
  HelpCircle,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';
import { useHireProof, formatGen } from './useHireProof';

export default function App() {
  const {
    address,
    bounties,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    createBounty,
    applyForBounty,
    cancelBounty,
    contractAddress
  } = useHireProof();

  // Create Job Form State
  const [rubric, setRubric] = useState('');
  const [bountyAmt, setBountyAmt] = useState('5');
  const [createErr, setCreateErr] = useState('');

  // Applicant submissions form state (tracked per job ID)
  const [transcriptUrls, setTranscriptUrls] = useState({});
  const [applyErr, setApplyErr] = useState({});

  const truncateAddr = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'N/A';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setCreateErr('');

    if (rubric.trim() === '') {
      setCreateErr('Soft skills evaluation rubric is required.');
      return;
    }
    const amt = parseFloat(bountyAmt);
    if (isNaN(amt) || amt <= 0) {
      setCreateErr('Please specify a positive GEN bounty amount.');
      return;
    }

    try {
      await createBounty(rubric, bountyAmt);
      setRubric('');
      setBountyAmt('5');
    } catch (err) {
      setCreateErr(err.message || 'Transaction failed');
    }
  };

  const handleApply = async (e, jobId) => {
    e.preventDefault();
    setApplyErr(prev => ({ ...prev, [jobId]: '' }));

    const url = transcriptUrls[jobId] || '';
    if (url.trim() === '') {
      setApplyErr(prev => ({ ...prev, [jobId]: 'Please provide a transcript/essay URL.' }));
      return;
    }

    try {
      await applyForBounty(jobId, url);
      setTranscriptUrls(prev => ({ ...prev, [jobId]: '' }));
    } catch (err) {
      setApplyErr(prev => ({ ...prev, [jobId]: err.message || 'Application failed' }));
    }
  };

  const handleUrlChange = (jobId, val) => {
    setTranscriptUrls(prev => ({ ...prev, [jobId]: val }));
  };

  // Determine score color classes
  const getScoreClass = (score) => {
    if (score >= 75) return 'high';
    if (score >= 50) return 'mid';
    return 'low';
  };

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header className="glass-panel">
        <div className="brand-section">
          <span className="brand-logo">🦄</span>
          <div>
            <h1 className="brand-title">HireProof</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Decentralized AI Headhunter & Soft Skills Escrow</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {address ? (
            <>
              <div className="wallet-badge" style={{ borderColor: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', boxShadow: '0 0 8px var(--accent-purple)' }}></span>
                <span>Studio Connected</span>
              </div>
              <div className="wallet-badge connected">
                <User size={14} style={{ color: 'var(--accent-green)' }} />
                <span>{truncateAddr(address)}</span>
              </div>
            </>
          ) : (
            <button className="btn" style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border-color)' }} onClick={connectWallet} disabled={loading}>
              <Award size={16} />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </header>

      {/* ERROR MESSAGE DISPLAY */}
      {error && (
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--accent-red)', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <ShieldAlert style={{ color: 'var(--accent-red)' }} />
          <div>
            <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>System Error</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="dashboard-layout">
        
        {/* SIDEBAR COL */}
        <div className="dashboard-sidebar">
          
          {/* PITCH BANNER */}
          <div className="pitch-banner">
            <h3 className="pitch-title">Why HireProof DIES without GenLayer</h3>
            <p className="pitch-text">
              Traditional blockchains cannot verify soft skills on Web2 blogs/Notion pages directly. Bringing off-chain APIs or centralized LLM integrations introduces security compromises. 
              <strong> GenLayer enables HireProof to run natively:</strong> scraping public transcript URLs (`web.render`), conducting blind evaluations (`exec_prompt`), achieving decentralized consensus, and distributing bounty payout bonuses instantly without intermediate trust or custom oracle configurations.
            </p>
          </div>

          {/* CREATE JOB BOUNTY CARD */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} style={{ color: 'var(--accent-purple)' }} />
              <span>Post Sign-on Bounty</span>
            </h2>
            <form onSubmit={handleCreateJob}>
              <div className="form-group">
                <label>Soft-Skills Rubric / HR Criteria</label>
                <textarea
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                  placeholder="e.g. Candidates must demonstrate high empathy, active listening, systematic crisis management, and a team-first resolution model."
                  disabled={loading || !address}
                  style={{ minHeight: '140px' }}
                />
              </div>

              <div className="form-group">
                <label>Sign-on Bonus Payout (GEN)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={bountyAmt}
                  onChange={(e) => setBountyAmt(e.target.value)}
                  disabled={loading || !address}
                />
              </div>

              {createErr && (
                <p style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>
                  {createErr}
                </p>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading || !address}>
                <Briefcase size={16} />
                <span>Post & Deposit Bounty</span>
              </button>
              
              {!address && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                  * Connect wallet to create a job bounty.
                </p>
              )}
            </form>
          </div>

          {/* TEST DATA HELP PANEL */}
          <div className="glass-panel" style={{ background: 'rgba(9,10,15,0.4)' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={14} />
              <span>Testing & Verification Tips</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              To verify the blind evaluation, publish an interview answers transcript or crisis essay on a public Notion page, Gist, or blog.
              <br /><br />
              <strong>Passed Test Draft:</strong> Answers demonstrating rich active-listening, collaboration, and logical structured steps.
              <br /><br />
              <strong>Failed Test Draft:</strong> Empty transcript, 404 URL, or answers showing egocentric, reactive, or combative traits.
            </p>
          </div>

        </div>

        {/* CONTENT COL */}
        <div className="dashboard-content">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignTerms: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Recruitment Bounties Pool</h2>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }} onClick={fetchBountiesState} disabled={loading}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Reload Jobs</span>
            </button>
          </div>

          {bounties.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Briefcase size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>No recruitment bounties found</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Create a bounty from the company sidebar to start the recruitment pool.</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {bounties.map((bounty) => (
                <div key={bounty.id} className="glass-panel job-card">
                  <div>
                    {/* Job Card Header */}
                    <div className="job-card-header">
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>JOB BOUNTY #{bounty.id}</span>
                        <span className={`status-tag ${bounty.status.toLowerCase()}`}>{bounty.status}</span>
                      </div>
                      <span className="bounty-badge">{formatGen(bounty.amount)} GEN</span>
                    </div>

                    {/* HR Rubric */}
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Desired Soft Skills Rubric:</span>
                      <p className="job-rubric-text">{bounty.rubric}</p>
                    </div>

                    {/* AI Evaluation Output / Last Attempt details */}
                    {(bounty.status === 'FILLED' || bounty.eq_score > 0 || bounty.logic_score > 0) && (
                      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <GraduationCap size={14} />
                            <span>Blind Evaluation Report</span>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {bounty.status === 'FILLED' ? 'Winner: ' : 'Latest: '} {truncateAddr(bounty.applicant)}
                          </span>
                        </div>

                        {/* Gauges */}
                        <div className="gauges-container">
                          <div className="gauge-box">
                            <div className="gauge-title">EQ Score</div>
                            <div className={`gauge-value ${getScoreClass(bounty.eq_score)}`}>{bounty.eq_score}/100</div>
                          </div>
                          <div className="gauge-box">
                            <div className="gauge-title">Logic Score</div>
                            <div className={`gauge-value ${getScoreClass(bounty.logic_score)}`}>{bounty.logic_score}/100</div>
                          </div>
                        </div>

                        {/* Feedback text */}
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '12px', fontStyle: 'italic', lineHeight: '1.5' }}>
                          "{bounty.feedback}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="job-footer">
                    {bounty.status === 'ACTIVE' && (
                      <form onSubmit={(e) => handleApply(e, bounty.id)}>
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <input
                            type="url"
                            placeholder="https://gist.github.com/... or Notion Page URL"
                            value={transcriptUrls[bounty.id] || ''}
                            onChange={(e) => handleUrlChange(bounty.id, e.target.value)}
                            disabled={loading || !address}
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                          />
                        </div>
                        
                        {applyErr[bounty.id] && (
                          <p style={{ color: 'var(--accent-red)', fontSize: '12px', marginBottom: '6px' }}>
                            {applyErr[bounty.id]}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px 16px', fontSize: '0.85rem' }} disabled={loading || !address}>
                            <Send size={12} />
                            <span>Submit Transcript & Verify</span>
                          </button>

                          {address && bounty.creator.toLowerCase() === address.toLowerCase() && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ width: 'auto', padding: '8px 12px' }}
                              onClick={() => cancelBounty(bounty.id)}
                              disabled={loading}
                              title="Cancel Job & Refund Deposit"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </form>
                    )}

                    {bounty.status === 'FILLED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontSize: '0.85rem', fontWeight: '500' }}>
                        <CheckCircle size={14} />
                        <span>Bounty claimed & payout released.</span>
                      </div>
                    )}

                    {bounty.status === 'CANCELLED' && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        Bounty cancelled by sponsor.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* TRANSACTION STATE FLOATING LOG */}
      {txHash && (
        <div className="glass-panel" style={{ position: 'fixed', bottom: '24px', right: '24px', maxWidth: '400px', zIndex: 1000, borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '700', color: '#c084fc' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span>GenLayer AI Recruitment Tx Log</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>{txStatus}</p>
          <a 
            href={`https://studio.genlayer.com/tx/${txHash}`} 
            target="_blank" 
            rel="noreferrer" 
            style={{ fontSize: '11px', color: 'var(--accent-blue)', textDecoration: 'underline', wordBreak: 'break-all' }}
          >
            Studio Hash: {txHash}
          </a>
        </div>
      )}
    </div>
  );
}
