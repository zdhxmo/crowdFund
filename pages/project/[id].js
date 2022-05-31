import {
  contractAddress
} from '../../config'
import CrowdFund from "../../build/contracts/CrowdFund.json"
import { BigNumber, ethers, web3 } from 'ethers'
import Web3Modal from 'web3modal'
import { useState } from 'react' // new

import { create as ipfsHttpClient } from 'ipfs-http-client'
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

import { useRouter } from 'next/router'
import Link from 'next/link'

const ipfsURI = 'https://ipfs.io/ipfs/'

/* TODO: refactor code to prevent multiple lines doing the same thing  */

export default function project({ project, projectID }) {
  const router = useRouter()
  const [contributionValue, setContributionValue] = useState(0);

  async function updateIPFSOnContribution() {
    const { id, name, description, projectDeadline, goal, totalPledged, totalDepositors, creator } = project

    let contri = Number(totalPledged) + Number(contributionValue)
    let newDepositors = Number(totalDepositors) + 1

    // stringify JSON data
    const data = JSON.stringify({
      id: id, name: name, creator: creator, description: description, projectDeadline: projectDeadline, goal: goal, totalPledged: contri, totalDepositors: newDepositors
    });

    try {
      // use client to add data
      const added = await client.add(data)
      // return url
      const url = `${added.path}`
      return url
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  async function contribute() {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    try {
      let contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
      let transaction = await contract.contributeFunds(BigNumber.from(project.id).toNumber(), {
        value: ethers.utils.parseUnits(contributionValue, "ether")
      })
      let x = await transaction.wait()

      if (x.status == 1) {
        const url = await updateIPFSOnContribution()

        let projectUpdate = await contract.updateProjectOnContribution(project.id, url, contributionValue)
        let y = await projectUpdate.wait()
        if (y.status == 1) router.push('/')
      }
    } catch (err) {
      window.alert(err.message)
    }
  }

  async function updateIPFSOnStateChange(newState) {
    const { id, name, description, projectDeadline, goal, totalPledged } = project

    const data = JSON.stringify({
      id: id, name: name, description: description, projectDeadline: projectDeadline, goal: goal, totalPledged: totalPledged, currentState: newState
    });

    try {
      // use client to add data
      const added = await client.add(data)
      // return url
      const url = `${added.path}`
      return url
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  async function changeStateToSuccess() {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    try {
      let contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
      let tx = await contract.endContributionsSuccess(BigNumber.from(project.id).toNumber());
      let x = await tx.wait()

      if (x.status == 1) {
        // state = 2 when success
        const newState = 2;
        const url = await updateIPFSOnStateChange(newState);
        let projectUpdate = await contract.updateProjectOnStateChange(project.id, url, newState);
        let y = await projectUpdate.wait()
        if (y.status == 1) {
          window.alert('Project state was successfully changed to : Success')
        }
      }
    } catch (err) {
      window.alert(err.message)
    }
  }

  async function changeStateToExpire() {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    try {
      let contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
      let tx = await contract.endContributionsExpire(BigNumber.from(project.id).toNumber());
      let x = await tx.wait()

      if (x.status == 1) {
        // state = 2 on expire
        const newState = 1;
        const url = await updateIPFSOnStateChange(newState);
        let projectUpdate = await contract.updateProjectOnStateChange(project.id, url, newState);
        let y = await projectUpdate.wait()
        if (y.status == 1) {
          window.alert('Project state was successfully changed to : Expire')
          router.push('/')
        }
      }
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    /* make long description wrap around  */
    <div className='grid mt-20 grid-cols-1 w-50'>
      <div className='bg-pink-500 text-white p-20 rounded-md mx-20 mt-20'>
        <p className='my-6'><span className='font-bold'> Project Number: </span> {project.id}</p>
        <p className='my-6'><span className='font-bold'> Creator: </span> {project.creator}</p>
        <p className='my-6'><span className='font-bold'> Project Name: </span> {project.name}</p>
        <p className='my-6'><span className='font-bold'>Description:</span> {project.description}</p>
        <p className='my-6'><span className='font-bold'>Crowdfund deadline:</span> {new Date((BigNumber.from(project.projectDeadline).toNumber()) * 1000).toLocaleDateString()}</p>
        <p className='my-6'><span className='font-bold'>Total ETH pledged:</span> {project.totalPledged} ETH</p>
        <p className='my-6'><span className='font-bold'>Fundraise Goal:</span> {project.goal} ETH</p>
        <p className='my-6'><span className='font-bold'>Total Contributors:</span> {project.totalDepositors}</p>

        <input
          onChange={e => setContributionValue(e.target.value)}
          type='number'
          className='p-2 my-2 rounded-md text-black'
          value={contributionValue}
        />
        <button onClick={contribute} className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 mx-4 shadow-md'>Contribute</button>

        {/* TODO: add this functionality */}
        <div className='flex'>
          <button onClick={changeStateToSuccess} className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 mx-4 shadow-lg w-50'>Click here if fundraise was a success (project owner only)</button>
          <button onClick={changeStateToExpire} className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 mx-4 shadow-lg w-50'>Click here if fundraise needs to be expired (contributors only)</button>
        </div>
      </div>

      <div className='grid grid-cols-1 px-10'>
        <Link href={`withdrawal/${projectID}`}>
          <button className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 mx-4 shadow-lg w-50'>Create Withdrawal Request</button>
        </Link>

        <Link href={`requests/${projectID}`}>
          <button className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 mx-4 shadow-lg w-50'>Approve/Reject/Withdraw</button>
        </Link>

        <button className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 mx-4 shadow-lg w-50'>Request Refund</button>

      </div>
    </div >
  )
}

export async function getStaticPaths() {
  // let provider = `https://ropsten.infura.io/v3/db0b4735bad24926a761d909e1f82576`
  let provider = new ethers.providers.JsonRpcProvider()
  const contract = new ethers.Contract(contractAddress, CrowdFund.abi, provider)
  const data = await contract.getAllProjects()

  const paths = data.map(d => ({ params: { id: d[10] } }))

  return {
    paths,
    fallback: true
  }
}

export async function getStaticProps({ params }) {
  const { id } = params
  const ipfs = `${ipfsURI}/${id}`
  const response = await fetch(ipfs)
  const data = await response.json()

  return {
    props: {
      project: data,
      projectID: id
    },
  }
}