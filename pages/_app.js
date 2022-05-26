import '../styles/globals.css'
import { AccountContext } from '../context.js'
import { useState } from 'react'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import Link from 'next/link'
import Head from 'next/head'

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
    <div className='min-h-screen w-screen font-mono'>
      <Head>
        <title>HoardNut</title>
        <meta name="description" content="Create New Fundraising Campaign" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className='sm:h-10'>
        <nav className='flex mx-auto text-black-20/100'>
          <Link href="/">
            <a>
              <img src="/logo.png" alt="crowdFund logo" className='h-20 object-contain my-5' />
            </a>
          </Link>

          {/* <div className='rounded-md my-10 p-3 mx-4 bg-pink-500 text-white'>
            {
              !account && (
                <div>
                  <button onClick={connect}>web3 Connect</button>
                </div>
              )
            }
            {
              account && <p>{account.length > 10 ? account.substr(0, 9) + "..." : account}</p>
            }
          </div> */}


          <div>
            <Link href="/create">
              <button className='rounded-md my-10 bg-pink-500 text-white p-3 mx-4' >Create</button>
            </Link>

            <Link href="/withdrawal">
              <button className='rounded-md my-10 bg-pink-500 text-white p-3 mx-4' >Withdraw</button>
            </Link>

            <Link href="/refund">
              <button className='rounded-md my-10 bg-pink-500 text-white p-3 mx-4' >Refund</button>
            </Link>
          </div>
        </nav>

      </div>

      <AccountContext.Provider value={account}>
        <Component {...pageProps} connect={connect} />
      </AccountContext.Provider>
    </div>)
}

export default MyApp
