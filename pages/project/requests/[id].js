import { ethers, BigNumber } from 'ethers'
import Web3Modal from 'web3modal'
import { useState } from 'react'
import { useRouter } from 'next/router'

import {
    contractAddress
} from '../../../config'
import CrowdFund from "../../../build/contracts/CrowdFund.json"

const ipfsURI = 'https://ipfs.io/ipfs/'
import { create as ipfsHttpClient } from 'ipfs-http-client'
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

export default function requests({ project, projectID }) {
    const router = useRouter()
    const [withdrawalRequests, setWithdrawalRequests] = useState([])
    // console.log(withdrawalRequests)

    async function getRequests() {
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        try {
            let contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
            let x = await contract.getAllWithdrawalRequests(project.id)
            setWithdrawalRequests(x);
        } catch (err) {
            window.alert(err.message)
        }
    }

    async function updateIPFSOnApproval(r) {
        const data = JSON.stringify({
            index: r[0], description: r[1], withdrawalAmount: r[2], recipient: r[3], approvedVotes: r[4] + 1, currentWithdrawalState: r[5], ipfsHash: r[6]
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

    async function approveRequest(r, projectID) {
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        try {
            let contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
            let tx = await contract.approveWithdrawalRequest(project.id, r[0])
            let x = await tx.wait()

            if (x.status == 1) {
                const url = await updateIPFSOnApproval(r);
                // if approved +1; if rejected -1
                let requestUpdate = await contract.updateRequestState(project.id, r[0], url);
                let y = await requestUpdate.wait();
                if (y.status == 1) router.push(`/project/${projectID}`)

            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    return (
        <div className='grid sm:grid-cols-1 lg:grid-cols-1 mt-20 '>
            <p className='text-center'>Only project contributors can access this functionality</p>

            <div className='bg-pink-500 text-white p-20 text-center rounded-md'>
                <button onClick={getRequests} className="bg-white text-black rounded-md my-10 px-3 py-2 shadow-lg border-2 w-80">Get all withdrawal requests</button>

                <p>Withdrawal requests</p>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6'>
                    {
                        withdrawalRequests.map(request =>
                            <div className='border shadow rounded-xl overflow-hidden' key={request[0]}>
                                <div className='p-4'>
                                    <p className='py-4'>request number: {request[0]}</p>
                                    <p className='py-4'>description: {request[1]}</p>
                                    <p className='py-4'>amount: {BigNumber.from(request[2]).toNumber()} ETH</p>
                                    <p className='py-4'>total approvals: {BigNumber.from(request[4]).toNumber()}</p>
                                    <p>Details: <a href={'https://ipfs.io/ipfs/' + request[6]}>click here</a></p>

                                    <div className='flex-auto '>
                                        <button onClick={() => approveRequest(request, projectID)} className="bg-white text-black rounded-md my-10 mx-1 px-3 py-2 shadow-lg border-2">Approve</button>
                                        <button className="bg-white text-black rounded-md my-10 px-3 mx-1 py-2 shadow-lg border-2">Reject</button>
                                        <button className="bg-white text-black rounded-md my-10 px-3 mx-1 py-2 shadow-lg border-2">Withdraw</button>
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