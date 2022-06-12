import Link from "next/link"
import { useEffect, useState } from 'react' // new
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
import { ethers } from 'ethers'

import CrowdFund from "../build/contracts/CrowdFund.json"
import { contractAddress } from '../config'

const initialState = { name: '', description: '', projectDeadline: '', goal: 0 };

const Create = () => {
    // router to route back to home page
    const router = useRouter()

    const [project, setProject] = useState(initialState)
    const [contract, setContract] = useState();

    useEffect(() => {
        // function to get contract address and update state
        async function getContract() {
            const web3Modal = new Web3Modal()
            const connection = await web3Modal.connect()
            const provider = new ethers.providers.Web3Provider(connection)
            const signer = provider.getSigner()
            let _contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
            setContract(_contract);
        }
        getContract();
    })

    async function saveProject() {
        // destructure project 
        const { name, description, projectDeadline, goal } = project
        try {
            // create project
            let transaction = await contract.createNewProject(name, description, projectDeadline, goal)

            // await successful transaction and reroute to home
            const x = await transaction.wait()
            if (x.status == 1) {
                router.push('/')
            }
        } catch (err) {
            window.alert(err)
        }
    }

    return (
        <div className="min-h-screen my-20 w-screen p-5">
            <main>
                <div className="rounded-md my-10 bg-pink-500 text-white p-3 w-20"><Link href="/"> Home </Link></div>
                <p className="text-center text-lg my-5">Create a new campaign!</p>

                <div className="bg-pink-500 text-black h-50 p-10 flex flex-col">
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
                        onChange={e => setProject({ ...project, projectDeadline: Math.floor(new Date() / 1000) + (e.target.value * 86400) })}
                        name='projectDeadline'
                        placeholder='Give it a deadline ... (in days)'
                        className='p-2 my-2 rounded-md'
                    />
                    <input
                        onChange={e => setProject({ ...project, goal: e.target.value })}
                        name='goalEth'
                        placeholder='Give it a goal ... (in ETH). Only integer values are valid'
                        className='p-2 my-2 rounded-md'
                    />
                    {/* <button type='button' className="w-20 text-white rounded-md my-10 px-3 py-2 shadow-lg border-2" onClick={saveProject}>Submit</button> */}

                    <button type='button' className="w-20 text-white rounded-md my-10 px-3 py-2 shadow-lg border-2" onClick={saveProject}>Submit</button>
                </div>
            </main>
        </div>
    )
}

export default Create