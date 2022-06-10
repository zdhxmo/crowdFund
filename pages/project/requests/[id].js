import { ethers, BigNumber } from 'ethers'
import Web3Modal from 'web3modal'
import { useState } from 'react'
import { useRouter } from 'next/router'

import {
    contractAddress
} from '../../../config'
import CrowdFund from "../../../build/contracts/CrowdFund.json"

const projectID = process.env.PROJECT_ID;

export default function Requests({ project, projectID }) {
    const router = useRouter()
    const [withdrawalRequests, setWithdrawalRequests] = useState([])
    const [contract, setContract] = useState();

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

    async function getRequests() {
        try {
            let x = await contract.getAllWithdrawalRequests(projectID)
            setWithdrawalRequests(x);
        } catch (err) {
            window.alert(err.message)
        }
    }

    async function approveRequest(r, projectID) {
        try {
            let tx = await contract.approveWithdrawalRequest(projectID, r[0])
            let x = await tx.wait()

            if (x.status == 1) {
                router.push(`/project/${projectID}`)
            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    async function rejectRequest(r, projectID) {
        try {
            let tx = await contract.rejectWithdrawalRequest(projectID, r[0])
            let x = await tx.wait()

            if (x.status == 1) {
                router.push(`/project/${projectID}`)
            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    async function transferFunds(r, projectID) {
        try {
            let tx = await contract.transferWithdrawalRequestFunds(projectID, r[0])
            let x = await tx.wait()

            if (x.status == 1) {
                router.push(`/project/${projectID}`)
            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    if (router.isFallback) {
        return <div>Loading...</div>
    }

    /* TODO::: wrap excess text in description */

    return (
        <div className='grid sm:grid-cols-1 lg:grid-cols-1 mt-20 '>
            <p className='text-center'>Only project contributors can access approve/reject functionality</p>
            <p className='text-center mt-3 mb-3'>Creators need more than 50% of the contributors to approve a request before withdrawal can be made</p>

            <div className='bg-pink-500 text-white p-20 text-center rounded-md'>
                <button onClick={getRequests} className="bg-white text-black rounded-md my-10 px-3 py-2 shadow-lg border-2 w-80">Get all withdrawal requests</button>

                <p className='font-bold'>All Withdrawal requests</p>

                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6'>
                    {
                        withdrawalRequests.map(request =>
                            <div className='border shadow rounded-xl text-left grid grid-cols-1' key={request[0]}>
                                <div className='p-4'>
                                    <p className='py-4'>request number: {request[0]}</p>
                                    <p className='py-4 overflow-x-scroll'>description: {request[1]}</p>
                                    <p className='py-4'>amount: {ethers.utils.formatEther(request[2])} ETH</p>
                                    <p className='py-4'>total approvals: {BigNumber.from(request[4]).toNumber()}</p>
                                    <p className='py-4'>total depositor: {project.totalDepositors}</p>

                                    <div className='sm:grid sm:grid-cols-1 xs:grid xs:grid-cols-1'>
                                        <button onClick={() => approveRequest(request, projectID)} className="bg-white text-black rounded-md my-10 mx-1 px-3 py-2 shadow-lg border-2">Approve</button>
                                        <button onClick={() => rejectRequest(request, projectID)} className="bg-white text-black rounded-md my-10 px-3 mx-1 py-2 shadow-lg border-2">Reject</button>
                                        <button onClick={() => transferFunds(request, projectID)} className="bg-white text-black rounded-md my-10 px-3 mx-1 py-2 shadow-lg border-2">Withdraw</button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </div >
    )
}

export async function getStaticPaths() {
    //   let provider = new ethers.providers.JsonRpcProvider(`https://ropsten.infura.io/v3/${projectID}`)
    let provider = new ethers.providers.JsonRpcProvider()
    const contract = new ethers.Contract(contractAddress, CrowdFund.abi, provider)
    const data = await contract.getAllProjects()

    // populate the dynamic routes with the id
    const paths = data.map(d => ({ params: { id: BigNumber.from(d[0]).toString() } }))

    return {
        paths,
        fallback: true
    }
}


// local fetch - change to ropsten/mainnet on deployement time
export async function getStaticProps({ params }) {
    // isolate ID from params
    const { id } = params

    // contact the blockchain
    //   let provider = new ethers.providers.JsonRpcProvider(`https://ropsten.infura.io/v3/${projectID}`)

    // localhost
    let provider = new ethers.providers.JsonRpcProvider()
    const contract = new ethers.Contract(contractAddress, CrowdFund.abi, provider)
    const data = await contract.getProjectDetails(id);

    // parse received data into JSON
    let projectData = {
        creator: data.creator,
        name: data.name,
        description: data.description,
        projectDeadline: BigNumber.from(data.projectDeadline).toNumber(),
        totalPledged: ethers.utils.formatEther(data.totalPledged),
        goal: ethers.utils.formatEther(data.goal),
        totalDepositors: BigNumber.from(data.totalDepositors).toNumber(),
        totalWithdrawn: ethers.utils.formatEther(data.totalWithdrawn),
        currentState: data.currentState
    }

    // return JSON data belonging to this route
    return {
        props: {
            project: projectData,
            projectID: id
        },
    }
}