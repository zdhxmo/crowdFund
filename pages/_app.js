import '../styles/globals.css'
import { AccountContext } from '../context.js'
import { useState } from 'react'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import Link from 'next/link'

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
    <div className='min-h-screen'>
      <div className='sm:h-10'>
        <nav className='flex mx-auto text-black bg-slate-600'>
          <Link href="/">
            <a>
              <img src="/logo.png" alt="crowdFund logo" className='h-20 object-contain my-5' />
            </a>
          </Link>

          <div className='rounded-md my-10 p-3 mx-4 bg-stone-200'>
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
          </div>


          <div>
            <Link href="/howItWorks" className='px-2'>
              <button className='rounded-md my-10 bg-stone-200 p-3 mx-4' >How it Works</button>
            </Link>

            <Link href="/createFR">
              <button className='rounded-md my-10 bg-stone-200 p-3 mx-4' >Create Fundraise</button>
            </Link>

            <Link href="/withdrawals">
              <button className='rounded-md my-10 bg-stone-200 p-3 mx-4' >Withdraw</button>
            </Link>

            <Link href="/requestRefund">
              <button className='rounded-md my-10 bg-stone-200 p-3 mx-4' >Refund</button>
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
