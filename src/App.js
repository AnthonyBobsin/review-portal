import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import kp from './keypair.json';
import { useEffect, useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Initialize the account using persisted key pair.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TEST_GIFS = [
  'https://media4.giphy.com/media/4JZB66hwV8xMOKKrKr/giphy.gif',
  'https://i.pinimg.com/originals/df/bb/b3/dfbbb3811ada2ed0d6fbb9b94331a869.gif',
  'https://i.pinimg.com/originals/54/28/5f/54285ff330c3efb53ca1fdbdc526c718.gif',
  'https://lindsaykphoto.com/wp-content/uploads/2021/04/los_angeles_stop_motion_lindsay_kreighbaum_banza_macaroni.gif',
  'https://i.pinimg.com/originals/43/4e/68/434e68b9e76a6134d5e29aac6781fa96.gif',
  'https://i.pinimg.com/originals/1a/a5/47/1aa54705bec480d107cb8e1d8e88755b.gif'
]

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [productList, setProductList] = useState([]);

  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
        }

        /*
         * The solana object gives us a function that will allow us to connect
         * directly with the user's wallet!
         */
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log('Connected with Public Key:', response.publicKey.toString());
        setWalletAddress(response.publicKey.toString());
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  };

  const createProductAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.initialize({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getProductList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  };


  const sendProduct = async () => {
    if (inputValue.length > 0) {
      console.log('Product link:', inputValue);
      
      try {
        const provider = getProvider();
        const program = new Program(idl, programID, provider);

        await program.rpc.addProduct(inputValue, {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
          },
        });
        console.log("Product successfully sent to program", inputValue)

        await getProductList();
        setInputValue('');
      } catch (error) {
        console.log("Error sending Product:", error)
      }
    } else {
      console.log('Empty input. Try again.');
    }
  };

  const getProductList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account)
      setProductList(account.productList)

    } catch (error) {
      console.log("Error in getProductList: ", error)
      setProductList(null);
    }
  };

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if (productList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createProductAccount}>
            Do One-Time Initialization For Product Program Account
          </button>
        </div>
      )
    }

    return (
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendProduct();
          }}
        >
          <input type="text" placeholder="Enter product link!" value={inputValue} onChange={onInputChange} />
          <button type="submit" className="cta-button submit-gif-button">Submit</button>
        </form>
        <div className="gif-grid">
          {productList.map((product, idx) => (
            <div className="gif-item" key={idx}>
              <img src={product.gifLink} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching product list...');

      // Call Solana program here.
      getProductList();

      // Set state
      setProductList(TEST_GIFS);
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 Review Portal</p>
          <p className="sub-text">
            Write reviews in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
