import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'

async function getWeb3Modal() {
    const web3Modal = new Web3Modal({
        network: 'ropsten',
        cacheProvider: false,
        providerOptions: {
            walletconnect: {
                package: WalletConnectProvider,

                // testnet deployement
                // options: {
                //   infuraId: process.env.PROJECT_ID
                // },

                // localhost for dev
                options: {
                    rpc: { 1337: 'http://localhost:8545', },
                    chainId: 1337,
                }
            },
        },
    })
    return web3Modal
}

export async function web3connect() {
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