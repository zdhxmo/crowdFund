import Link from "next/link"
import Head from 'next/head'
import { useState, useRef, useEffect } from 'react' // new
import { create } from 'ipfs-http-client'
import { useRouter } from 'next/router'


const initialState = { name: '', description: '', imageURL: '', projectDeadline: '', goal: '' };
const client = create('https://ipfs.infura.io:5001/api/v0')
import CrownFund from "../build/contracts/CrowdFund.json"
import {
  contractAddress, platformAdmin
} from '../config'

const createFR = () => {
  const router = useRouter()
  const [project, setProject] = useState(initialState)

  async function createNewProject() {
    if (!name || !description || !imageURL || !projectDeadline || !goal) return;
    const hash = await saveProjectToIpfs()
    await saveProject();
    router.push("/");
  }

  async function saveProjectToIpfs() {

  }

  async function saveProject() {

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

        <form className="bg-pink-500 text-white h-50 p-10 flex flex-col">
          <input
            onChange={e => setProject({ ...project, name: e.target.value })}
            name='title'
            placeholder='Give it a name ...'
            value={project.name}
            className='p-2 my-2 rounded-md'
          />
          <input
            onChange={e => setProject({ ...project, description: e.target.value })}
            name='description'
            placeholder='Give it a description ...'
            value={project.description}
            className='p-2 my-2 rounded-md'
          />
          <input
            onChange={e => setProject({ ...project, imageURL: e.target.value })}
            name='imageURL'
            placeholder='Give it the IPFS hash of image ...'
            value={project.imageURL}
            className='p-2 my-2 rounded-md'
          />
          <input
            onChange={e => setProject({ ...project, projectDeadline: e.target.value })}
            name='projectDeadline'
            placeholder='Give it a deadline ...'
            value={project.projectDeadline}
            className='p-2 my-2 rounded-md'
          />
          <input
            onChange={e => setProject({ ...project, goal: e.target.value })}
            name='goalEth'
            placeholder='Give it a goal ... (in ETH)'
            value={project.goal}
            className='p-2 my-2 rounded-md'
          />
          <button type='button' className="w-20 border-black rounded-md my-10 p-3 mx-4" onClick={createNewProject}>Submit</button>
        </form>
      </main>

    </div>
  )
}

export default createFR