import React from 'react'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'

const Web3ModalConnect = () => {
  // function to get contract address and update state
  async function getSigner() {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    return signer;
  }
  getSigner();
  return (
    <div>web3 modal connecting</div>
  )
}

export default Web3ModalConnect