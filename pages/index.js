import {
  contractAddress
} from '../config'
import CrowdFund from "../build/contracts/CrowdFund.json"
import { ethers, BigNumber } from 'ethers'
import Link from 'next/link'

// require('dotenv').config();
const projectID = process.env.PROJECT_ID;

export default function Home({ projects }) {
  console.log(projectID)
  return (
    <div className='min-h-screen my-20 w-screen p-5'>
      <p className='text-center'>test project</p>
      <p className='text-center'>do not speed up transactions in metamask</p>
      <p className='text-center'>loading is slow as processes are not optimized yet</p>
      <p className='text-center'>please be patient during blockchain interactions, once transaction is complete, you will be directed to the appropriate page</p>


      <div className='bg-pink-500 text-white p-10 rounded-md'>
        <div>
          <p className='font-bold m-5'>How it Works</p>
          <p className='my-3'>1. Creator creates a new project </p>

          <p className='my-3'>2. Contributors contribute until deadline</p>
          <p className='my-3'>3. If total pledged doesn't get met on deadline date, contributors expire the project and refund donated funds back</p>
          <p className='my-3'>4. If total amount pledged reaches the goal, creator declares the fundraise a success</p>
          <div className='my-3'>
            <p className='my-3 ml-10'>a. creator makes a withdrawal request</p>
            <p className='my-3 ml-10'>b. contributors vote on the request</p>
            <p className='my-3 ml-10'>c. if approved, creator withdraws the amount requested to work on the project</p>
          </div>
        </div>
      </div>
      <div className='text-black'>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {
            projects.map((project, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <div className="p-4">
                  <p>ID: {BigNumber.from(project[0]).toNumber()}</p>
                  <p className="my-6 text-2xl font-semibold">{project[2]}</p>
                  <div>
                    <p className="my-3 text-gray-400">{project[3]}</p>
                    <p className="my-3"> Deadline:  {
                      // project[4] - bignumber
                      // BigNumber.from(project[4]).toNumber() - unix timestamp
                      // (BigNumber.from(project[4]).toNumber()) * 1000 - converted to milliseconds
                      new Date((BigNumber.from(project[4]).toNumber()) * 1000).toLocaleDateString()
                    } </p>

                    <p className="my-3"> Total Pledged:  {
                      ethers.utils.formatEther(project[5])
                    } ETH</p>

                    <p className="my-3"> Goal:  {
                      ethers.utils.formatEther(project[6])
                    } ETH </p>
                  </div>

                  <Link href={`project/${project[10]}`} key={i}>
                    <button className='rounded-md my-5 bg-pink-500 text-white p-3 mx-1'>Details</button>
                  </Link>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div >
  )
}

export async function getServerSideProps() {
  let provider = new ethers.providers.JsonRpcProvider(`https://ropsten.infura.io/v3/${projectID}`)
  const contract = new ethers.Contract(contractAddress, CrowdFund.abi, provider)
  const data = await contract.getAllProjects()
  return {
    props: {
      projects: JSON.parse(JSON.stringify(data))
    }
  }
}