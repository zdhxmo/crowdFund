import { ethers } from 'ethers'
import {
    contractAddress
} from '../../../config'
import CrowdFund from "../../../build/contracts/CrowdFund.json"
const ipfsURI = 'https://ipfs.io/ipfs/'
import Web3Modal from 'web3modal'
import { useState } from 'react'

export default function requests({ project, projectID }) {
    const [withdrawalRequests, setWithdrawalRequests] = useState([])

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
    return (
        <div className='grid sm:grid-cols-1 lg:grid-cols-1 mt-20 '>
            <p className='text-center'>Only project contributors can access this functionality</p>

            <div className='bg-pink-500 text-white p-20 text-center rounded-md'>
                <button onClick={getRequests} className="bg-white text-black rounded-md my-10 px-3 py-2 shadow-lg border-2 w-80">Get all withdrawal requests</button>

                <p>Withdrawal requests</p>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6'>
                    {/* {
                         withdrawalRequests.map(async (request) => {
                            const ipfs = `${ipfsURI}/${request[6]}`
                            const response = await fetch(ipfs)
                            const data = await response.json()
                            console.log(data)

                            {
                                <div className='border shadow rounded-xl overflow-hidden' key={data[0]} >
                                    <div className='p-4'>
                                        <p className='py-4'>id: {data[0]}</p>
                                        <p className='py-4'>description: {data[1]}</p>
                                        <p className='py-4'>amount: {BigNumber.from(data[2]).toNumber()}</p>
                                        <p className='py-4'>total approvals: {BigNumber.from(data[4]).toNumber()}</p>
                                        <div className='flex-auto '>
                                            <button className="bg-white text-black rounded-md my-10 mx-5 px-3 py-2 shadow-lg border-2">Approve</button>
                                            <button className="bg-white text-black rounded-md my-10 px-3 mx-5 py-2 shadow-lg border-2">Reject</button>
                                        </div>
                                    </div>
                                </div>
                            }
                        }

                        )
                    } */}
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