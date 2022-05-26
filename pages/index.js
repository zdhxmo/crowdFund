import {
  contractAddress
} from '../config'
import CrowdFund from "../build/contracts/CrowdFund.json"
import { ethers, BigNumber } from 'ethers'
import Link from 'next/link'

export default function Home({ projects }) {
  return (
    <div className='min-h-screen my-20 w-screen p-5'>
      <p className='text-center'>this test project only works on ropsten testnet </p>

      <div className='bg-pink-500 text-white p-10 text-center rounded-md'>
        <div>
          <p className='font-bold m-5'>How it Works</p>
          <div className='my-3'> 1. Community contributes to project and all contributions get pooled </div>
          <div className='my-3'> 2. Project creators write a proposal and the donors approve of fund withdrawal </div>
          <div className='my-3'> 3. If fundraising expires without goal being met, contributors appeal to get their refunds back.  </div>
        </div>
      </div>
      <div className='text-black'>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {
            projects.map((project, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <div className="p-4">
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
                      BigNumber.from(project[5]).toNumber()
                    } </p>

                    <p className="my-3"> Goal:  {
                      ethers.utils.formatEther(project[6])
                    } ETH </p>
                  </div>

                  <Link href={`project/${project[11]}`} key={i}>
                    <button className='rounded-md my-5 bg-pink-500 text-white p-3 mx-1'>Details</button>
                  </Link>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps() {
  // let provider = `https://ropsten.infura.io/v3/db0b4735bad24926a761d909e1f82576`
  let provider = new ethers.providers.JsonRpcProvider()
  const contract = new ethers.Contract(contractAddress, CrowdFund.abi, provider)
  const data = await contract.getAllProjects()
  return {
    props: {
      projects: JSON.parse(JSON.stringify(data))
    }
  }
}