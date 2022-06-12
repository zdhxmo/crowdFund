import { AccountContext } from '../context.js'
import { useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import NextNProgress from "nextjs-progressbar";
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'

import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  const [account, setAccount] = useState(null)

  async function getWeb3Modal() {
    const web3Modal = new Web3Modal({
      network: 'rinkeby',
      cacheProvider: false,
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,

          // testnet deployement
          options: {
            infuraId: process.env.PROJECT_ID
          },

          // localhost for dev
          // options: {
          //   rpc: { 1337: 'http://localhost:8545', },
          //   chainId: 1337,
          // }
        },
      },
    })
    return web3Modal
  }

  async function web3connect() {
    try {
      const web3Modal = await getWeb3Modal()
      const connection = await web3Modal.connect()
      const provider = new ethers.providers.Web3Provider(connection)
      const accounts = await provider.listAccounts()
      return accounts;
    } catch (err) {
      console.log('error:', err)
    }
  }

  // connect to wallet
  async function connect() {
    const accounts = await web3connect()
    setAccount(accounts)
  }

  return (
    <div className='min-h-screen w-screen font-mono'>
      <Head>
        <title>iFund</title>
        <meta name="description" content="Create New Fundraising Campaign" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className='sm:h-10'>
        <nav className='flex mx-auto text-black-20/100'>
          <Link href="/">
            <a>
              <img src="/logo.png" alt="crowdFund logo" className='h-20 object-contain my-5 ml-5' />
            </a>
          </Link>

          <div className='flex'>
            {
              !account ?
                <div className='my-10 mx-10' >
                  <p>Pls connect to interact with this app</p>
                  <button className='rounded-md bg-pink-500 text-white p-3 ml-20' onClick={connect}>Connect</button>
                </div> :
                <p className='rounded-md my-10 bg-pink-500 text-white p-3 ml-20' >
                  {account[0].substr(0, 10) + "..."}
                </p>
            }

            <Link href="/create">
              <button className='rounded-md my-10 bg-pink-500 text-white p-3 ml-20' >Create New Fundraising Project</button>
            </Link>
          </div>
        </nav>
      </div>

      {/* set account context and propogate across the app */}
      <AccountContext.Provider value={account}>
        <NextNProgress />
        {account && <Component {...pageProps} connect={connect} />}
      </AccountContext.Provider>
    </div>)
}

export default MyApp
