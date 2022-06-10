import { BigNumber, ethers, web3 } from 'ethers'
import Web3Modal from 'web3modal'
import { useState, useContext, useEffect } from 'react' // new
import { useRouter } from 'next/router'
import Link from 'next/link'

import {
    contractAddress
} from '../../config'
import { AccountContext } from '../../context'
import CrowdFund from "../../build/contracts/CrowdFund.json"

const projectID = process.env.PROJECT_ID;

export default function Project({ project, projectID }) {
    useContext(AccountContext);

    const router = useRouter()
    const [contributionValue, setContributionValue] = useState(0);

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

    // Function to contribute funds to the project
    async function contribute() {
        try {
            // send contribution
            let transaction = await contract.contributeFunds(projectID, {
                value: ethers.utils.parseUnits(contributionValue, "ether")
            })
            // await transaction
            let x = await transaction.wait()

            // reroute to home page
            if (x.status == 1) {
                router.push('/')
            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    // function to declare fundraise a success
    async function changeStateToSuccess() {
        try {
            let tx = await contract.endContributionsSuccess(projectID);
            let x = await tx.wait()

            if (x.status == 1) {
                router.push(`/project/${projectID}`);
                window.alert('Project state was successfully changed to : Success')
            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    // function to declare fundraise a failure
    async function changeStateToExpire() {
        try {
            let tx = await contract.endContributionsExpire(projectID);
            let x = await tx.wait()

            if (x.status == 1) {
                window.alert('Project state was successfully changed to : Expire')
            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    // function to process a refund on failed fundraise
    async function processRefund() {
        try {
            let tx = await contract.getRefund(projectID);
            let x = await tx.wait()

            if (x.status == 1) {
                window.alert('Successful Refund')
                router.push('/');
            }
        } catch (err) {
            window.alert(err.message)
        }
    }

    if (router.isFallback) {
        return <div>Loading...</div>
    }

    return (
        /* TODO::: make long description wrap around  */
        <div className='mt-20'>
            <div className='bg-pink-500 text-white p-20 rounded-md mx-5 mt-20 overflow-x-scroll'>
                <p className='my-6'><span className='font-bold'> Project Number: </span> {projectID}</p>
                <p className='my-6'><span className='font-bold'> Creator: </span> {project.creator}</p>
                <p className='my-6'><span className='font-bold'> Project Name: </span> {project.name}</p>
                <p className='my-6'><span className='font-bold'>Description:</span> {project.description}</p>
                <p className='my-6'><span className='font-bold'>Crowdfund deadline:</span> {new Date((BigNumber.from(project.projectDeadline).toNumber()) * 1000).toLocaleDateString()}</p>
                <p className='my-6'><span className='font-bold'>Total ETH pledged:</span> {project.totalPledged} ETH</p>
                <p className='my-6'><span className='font-bold'>Fundraise Goal:</span> {project.goal} ETH</p>
                <p className='my-6'><span className='font-bold'>Total Contributors:</span> {project.totalDepositors}</p>
                <p className='my-6'><span className='font-bold'>Current State:</span> {project.currentState === 0 ? 'Fundraise Active' : (project.currentState === 1) ? 'Fundraise Expired' : 'Fundraise Success'}</p>

                <p className='my-6'><span className='font-bold'>Total Withdrawals:</span> {project.totalWithdrawn} ETH</p>

                <div className='text-center'>
                    <input
                        onChange={e => setContributionValue(e.target.value)}
                        type='number'
                        className='p-2 my-2 rounded-md text-black'
                        value={contributionValue}
                    />
                    <button onClick={contribute} className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 mx-4 shadow-md'>Contribute</button>
                </div>


                <div className='grid sm:grid-col-1 md:grid-cols-2 sm:text-sm'>
                    <div className='grid grid-cols-1 px-10 sm:w-200 place-content-stretch'>
                        <button onClick={changeStateToSuccess} className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 shadow-lg flex-wrap'>Click here if fundraise was a success (project owner only)</button>

                        <Link href={`withdrawal/${projectID}`}>
                            <button className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 shadow-lg min-w-50'>Create Withdrawal Request</button>
                        </Link>

                        <Link href={`requests/${projectID}`}>
                            <button className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 shadow-lg flex-wrap'>Approve / Reject / Withdraw</button>
                        </Link>
                    </div>

                    <div className='grid grid-cols-1 px-10'>
                        <button onClick={changeStateToExpire} className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 shadow-lg w-50'>Click here if fundraise needs to be expired (contributors only)</button>

                        <button onClick={processRefund} className='rounded-md mt-20 my-10 bg-white text-pink-500 p-3 shadow-lg w-50'>Request Refund</button>
                    </div>
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