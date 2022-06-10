import { BigNumber, ethers } from 'ethers'
import { useState } from 'react'
import Web3Modal from 'web3modal'
import { useRouter } from 'next/router'

import {
    contractAddress
} from '../../../config'
import CrowdFund from "../../../build/contracts/CrowdFund.json"

const projectID = process.env.PROJECT_ID;

const initialState = { requestNo: '', requestDescription: '', amount: 0 };

export default function Withdrawal({ projectID }) {
    const router = useRouter()

    const [withdrawalRequest, setWithdrawalRequest] = useState(initialState)
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


    async function requestWithdrawal() {
        const { requestNo, requestDescription, amount } = withdrawalRequest;

        try {
            let transaction = await contract.createWithdrawalRequest(projectID, requestNo, requestDescription, amount)
            const x = await transaction.wait()

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

    return (
        <div className='grid sm:grid-cols-1 lg:grid-cols-1 mt-20 '>
            <p className='text-center'>Only project creator can access this functionality on goal reached</p>
            <div className='bg-pink-500 text-black p-20 text-center rounded-md mx-5 flex flex-col'>
                <input
                    type='number'
                    onChange={e => setWithdrawalRequest({ ...withdrawalRequest, requestNo: e.target.value })}
                    name='requestNo'
                    placeholder='Request number...'
                    className='p-2 mt-5 rounded-md'
                    value={withdrawalRequest.requestNo} />
                <textarea
                    onChange={e => setWithdrawalRequest({ ...withdrawalRequest, requestDescription: e.target.value })}
                    name='requestDescription'
                    placeholder='Give it a description ...'
                    className='p-2 mt-5 rounded-md'
                />
                <input
                    onChange={e => setWithdrawalRequest({ ...withdrawalRequest, amount: e.target.value })}
                    name='amount'
                    placeholder='Withdrawal amount ... (in ETH). Only integer values are valid'
                    className='p-2 mt-5 rounded-md'
                />
                <button type='button' className="w-20 bg-white rounded-md my-10 px-3 py-2 shadow-lg border-2" onClick={requestWithdrawal}>Submit</button>
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

    // return JSON data belonging to this route
    return {
        props: {
            // project: projectData,
            projectID: id
        },
    }
}