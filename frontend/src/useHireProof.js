import { useState, useCallback, useEffect } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

let _readClient = null;

function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: studionet });
  }
  return _readClient;
}

function getWriteClient(account) {
  return createClient({ chain: studionet, account });
}

// Convert Wei (u256) to human readable GEN string
export function formatGen(weiVal) {
  if (!weiVal) return '0';
  try {
    const big = BigInt(weiVal);
    const integerPart = big / 10n**18n;
    const fractionalPart = big % 10n**18n;
    let fractionStr = fractionalPart.toString().padStart(18, '0');
    fractionStr = fractionStr.replace(/0+$/, ''); // Trim trailing zeros
    if (fractionStr === '') {
      return integerPart.toString();
    }
    return `${integerPart}.${fractionStr.slice(0, 4)}`;
  } catch (e) {
    return '0';
  }
}

// Convert human readable GEN input to Wei (u256 BigInt)
export function parseGen(genVal) {
  if (!genVal || genVal.toString().trim() === '') return 0n;
  try {
    const parts = genVal.toString().split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';
    fractionalPart = fractionalPart.slice(0, 18).padEnd(18, '0');
    return BigInt(integerPart) * 10n**18n + BigInt(fractionalPart);
  } catch (e) {
    return 0n;
  }
}

export function useHireProof() {
  const [address, setAddress] = useState('');
  const [glAccount, setGlAccount] = useState(null);
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Connect Wallet (MetaMask or fallback ephemeral account)
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0].toLowerCase();
        setAddress(addr);
        setGlAccount(addr);
      } else {
        // Ephemeral account fallback
        let savedKey = localStorage.getItem('__hireproof_sk');
        let acct;
        if (savedKey) {
          acct = createAccount(savedKey);
        } else {
          acct = createAccount();
          localStorage.setItem('__hireproof_sk', acct.privateKey);
        }
        const addr = acct.address.toLowerCase();
        setAddress(addr);
        setGlAccount(acct);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError('Wallet connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all bounties and their detailed states
  const fetchBountiesState = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    setLoading(true);
    try {
      const client = getReadClient();
      
      // Get the number of bounties
      const rawCount = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_bounty_count',
        args: [],
      });
      const count = Number(rawCount);
      
      const fetchedBounties = [];
      for (let i = 0; i < count; i++) {
        const rawBounty = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_bounty',
          args: [i],
        });
        const bountyObj = JSON.parse(rawBounty);
        fetchedBounties.push(bountyObj);
      }
      
      setBounties(fetchedBounties.reverse()); // Show newest first
      setError('');
    } catch (err) {
      console.error('Error fetching bounties:', err);
      setError('Failed to fetch jobs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Job Bounty
  const createBounty = async (rubric, amountGen) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus('Creating recruitment bounty and locking funds...');

    try {
      const client = getWriteClient(glAccount);
      const valueWei = parseGen(amountGen);
      
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_bounty',
        args: [rubric.trim()],
        value: valueWei,
      });
      
      setTxHash(hash);
      setTxStatus('Bounty creation broadcasted. Awaiting block inclusion...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Job bounty created and funded.');
      await fetchBountiesState();
      return receipt;
    } catch (err) {
      console.error('Bounty creation failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Submit Application (Scrapes transcript and evaluates soft skills)
  const applyForBounty = async (bountyId, transcriptUrl) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus('Submitting transcript URL for blind AI HR evaluation...');

    try {
      const client = getWriteClient(glAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'apply_for_bounty',
        args: [Number(bountyId), transcriptUrl.trim()],
      });
      
      setTxHash(hash);
      setTxStatus('GenLayer validators are scraping the text and evaluating your soft skills. This takes 15-30s...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Evaluation error';
        throw new Error(errorMsg);
      }

      setTxStatus('Evaluation complete! Consensus on soft-skills score reached.');
      await fetchBountiesState();
      return receipt;
    } catch (err) {
      console.error('Application failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cancel Bounty (Refund company)
  const cancelBounty = async (bountyId) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus('Cancelling job bounty and withdrawing locked GEN tokens...');

    try {
      const client = getWriteClient(glAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'cancel_bounty',
        args: [Number(bountyId)],
      });
      
      setTxHash(hash);
      setTxStatus('Broadcasting cancellation request...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Cancellation error';
        throw new Error(errorMsg);
      }

      setTxStatus('Bounty successfully cancelled. Locked GEN returned.');
      await fetchBountiesState();
      return receipt;
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (CONTRACT_ADDRESS) {
      fetchBountiesState();
    }
  }, [CONTRACT_ADDRESS, address, fetchBountiesState]);

  return {
    address,
    bounties,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    fetchBountiesState,
    createBounty,
    applyForBounty,
    cancelBounty,
    contractAddress: CONTRACT_ADDRESS,
  };
}
