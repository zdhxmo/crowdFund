import { BigNumber, ethers, web3 } from 'ethers'
import {
    contractAddress
} from '../../../config'
import CrowdFund from "../../../build/contracts/CrowdFund.json"
const ipfsURI = 'https://ipfs.io/ipfs/'
import { useState } from 'react'
import Web3Modal from 'web3modal'

const initialState = { id: 0, requestNo: '', description: '', amount: 0 };

export default function withdrawal({ project, projectID }) {
    const [withdrawalRequest, setWithdrawalRequest] = useState(initialState)

    async function requestWithdrawal() {
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        try {
            let contract = new ethers.Contract(contractAddress, CrowdFund.abi, signer)
            let transaction = await contract.createWithdrawalRequest(BigNumber.from(project.id).toNumber(), withdrawalRequest.requestNo, withdrawalRequest.description, withdrawalRequest.amount)
            await transaction.wait()
        } catch (err) {
            window.alert(err.message)
        }
    }

    return (
        <div className='grid sm:grid-cols-1 lg:grid-cols-1 mt-20 '>
            <div className='bg-pink-500 text-black p-20 text-center rounded-md mx-5 flex flex-col'>
                <input
                    type='number'
                    onChange={e => setWithdrawalRequest({ ...withdrawalRequest, requestNo: e.target.value })}
                    name='requestNo'
                    placeholder='Request number...'
                    className='p-2 mt-5 rounded-md'
                    value={project.requestNo} />
                <textarea
                    onChange={e => setWithdrawalRequest({ ...withdrawalRequest, description: e.target.value })}
                    name='description'
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
            project: data,
            projectID: id
        },
    }
}