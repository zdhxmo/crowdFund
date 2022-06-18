import { ethers } from 'ethers'
import Web3Modal from 'web3modal'

import {
    contractAddress
} from '../config.js'
import CrowdFund from "../build/contracts/CrowdFund.json"

async function getContract() {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    let _contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
    return _contract;
}

module.exports = { getContract }
