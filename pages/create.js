import Link from "next/link"
import Head from 'next/head'
import { useState } from 'react' // new
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
import { ethers } from 'ethers'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')
import CrowdFund from "../build/contracts/CrowdFund.json"
import {
  contractAddress, platformAdmin
} from '../config'

const initialState = { name: '', description: '', projectDeadline: '', goal: '' };
const create = () => {
  const router = useRouter()
  const [project, setProject] = useState(initialState)

  async function uploadToIPFS() {
    const { name, description, projectDeadline, goal } = project
    if (!name || !description || !projectDeadline || !goal) return
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name: name, description: description, projectDeadline: projectDeadline, goal: goal
    });

    try {
      const added = await client.add(data)
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      /* after file is uploaded to IPFS, return the URL to use it in the transaction */
      return url
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  async function saveProject() {
    const { name, description, projectDeadline, goal } = project
    const url = await uploadToIPFS()
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    /* next, create the item */
    let contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
    let transaction = await contract.createNewProject(name, description, projectDeadline, goal, url)
    await transaction.wait()

    router.push('/')
  }

  return (
    <div className="min-h-screen my-20 w-screen p-5">
      <Head>
        <title>New Fundraising Campaign</title>
        <meta name="description" content="Create New Fundraising Campaign" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <main>
        <div className="flex-auto">
          <div className="rounded-md my-10 bg-pink-500 text-white p-3 mx-4 w-40"><Link href="/"> Back to Home</Link></div>
          <p className="text-center text-lg my-5">Create a new campaign!</p>
        </div>

        <div className="bg-pink-500 text-black h-50 p-10 flex flex-col align-middle">
          <input
            onChange={e => setProject({ ...project, name: e.target.value })}
            name='title'
            placeholder='Give it a name ...'
            className='p-2 my-2 rounded-md'
            value={project.name}
          />
          <textarea
            onChange={e => setProject({ ...project, description: e.target.value })}
            name='description'
            placeholder='Give it a description ...'
            className='p-2 my-2 rounded-md'
          />
          <input
            onChange={e => setProject({ ...project, projectDeadline: e.target.value })}
            name='projectDeadline'
            placeholder='Give it a deadline ...'
            className='p-2 my-2 rounded-md'
          />
          <input
            onChange={e => setProject({ ...project, goal: e.target.value })}
            name='goalEth'
            placeholder='Give it a goal ... (in ETH)'
            className='p-2 my-2 rounded-md'
          />
          <button type='button' className="w-20 text-white rounded-md my-10 px-3 py-2 shadow-lg border-2" onClick={saveProject}>Submit</button>
        </div>
      </main>
    </div>
  )
}

export default create