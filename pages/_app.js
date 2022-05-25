import '../styles/globals.css'
import { AccountContext } from '../context.js'
import { useState } from 'react'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'

function MyApp({ Component, pageProps }) {
  const [account, setAccount] = useState(null)

  async function getWeb3Modal() {
    const web3Modal = new Web3Modal({
      network: 'ropsten',
      cacheProvider: false,
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: process.env.PROJECT_ID
          },
        },
      },
    })
    return web3Modal
  }

  async function connect() {
    try {
      const web3Modal = await getWeb3Modal()
      const connection = await web3Modal.connect()
      const provider = new ethers.providers.Web3Provider(connection)
      const accounts = await provider.listAccounts()
      setAccount(accounts[0])
    } catch (err) {
      console.log('error:', err)
    }
  }


  return (

    <div>

      <div>
        {
          !account && (
            <div>
              <button onClick={connect}>Connect</button>
            </div>
          )
        }
        {
          account && <p>{account}</p>
        }
      </div>

      <AccountContext.Provider value={account}>
        <Component {...pageProps} connect={connect} />
      </AccountContext.Provider>
    </div>)
}

export default MyApp
