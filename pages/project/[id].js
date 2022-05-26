import {
  contractAddress
} from '../../config'
import CrowdFund from "../../build/contracts/CrowdFund.json"
import { BigNumber, ethers, web3 } from 'ethers'
import Web3Modal from 'web3modal'
import { useState } from 'react' // new

const ipfsURI = 'https://ipfs.io/ipfs/'

export default function project({ project }) {
  const [contributionValue, setContributionValue] = useState(0);

  // async function updateIPFS() {
  //   // stringify JSON data
  //   const data = JSON.stringify({
  //     id: project.id, name: project.name, description: project.description, projectDeadline: project.projectDeadline, goal: project.goal, totalPledged: contributionValue
  //   });

  //   try {
  //     // use client to add data
  //     const added = await client.add(data)
  //     // return url
  //     const url = `${added.path}`
  //     return url
  //   } catch (error) {
  //     console.log('Error uploading file: ', error)
  //   }
  // }

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
      await transaction.wait()

      // const url = await updateIPFS()

      // let projectUpdate = await contract.updateProject(project.id, url, contributionValue)
      // await projectUpdate.wait()
    } catch (err) {
      window.alert(err)
    }
  }

  return (
    <div className='grid mt-20'>
      <div className='bg-pink-500 text-white p-20 text-center rounded-md mx-20 mt-20'>
        <p className='my-6'><span className='font-bold'> Project Number: </span> {BigNumber.from(project.id).toNumber()}</p>
        <p className='my-6'><span className='font-bold'> Project Name: </span> {project.name}</p>
        <p className='my-6'><span className='font-bold'>Description:</span> {project.description}</p>
        <p className='my-6'><span className='font-bold'>Crowdfund deadline:</span> {new Date((BigNumber.from(project.projectDeadline).toNumber()) * 1000).toLocaleDateString()}</p>
        <p className='my-6'><span className='font-bold'>Total ETH pledged:</span> {project.totalPledged} ETH</p>
        <p className='my-6'><span className='font-bold'>Fundraise Goal:</span> {project.goal} ETH</p>

        {/* Add contribution functionality */}
        <input
          onChange={e => setContributionValue(e.target.value)}
          type='number'
          className='p-2 my-2 rounded-md text-black'
          value={contributionValue}
        />
        <button onClick={contribute} className='rounded-md my-10 bg-white text-pink-500 p-3 mx-4 shadow-md'>Contribute</button>

      </div>
    </div>
  )
}

export async function getStaticPaths() {
  // let provider = `https://ropsten.infura.io/v3/db0b4735bad24926a761d909e1f82576`
  let provider = new ethers.providers.JsonRpcProvider()
  const contract = new ethers.Contract(contractAddress, CrowdFund.abi, provider)
  const data = await contract.getAllProjects()

  const paths = data.map(d => ({ params: { id: d[11] } }))

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
      project: data
    },
  }
}