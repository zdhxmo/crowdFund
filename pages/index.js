import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useContext } from 'react'
import { AccountContext } from '../context'
import { useRouter } from 'next/router'
import {
  contractAddress, platformAdmin
} from '../config'
import CrowdFund from "../build/contracts/CrowdFund.json"
import { ethers } from 'ethers'
import Link from 'next/link'

export default function Home({ projects }) {
  return (
    <div className='min-h-screen my-20 w-screen p-5'>
      <p className='text-center'>this test project only works on localhost and ropsten network </p>

      <div className='bg-pink-500 text-white p-10 text-center rounded-md'>
        <div>
          <p className='font-bold m-5'>How it Works</p>
          <div className='my-3'> 1. Community contributes to project and all contributions get pooled </div>
          <div className='my-3'> 2. Project creators write a proposal and the donors approve of fund withdrawal </div>
          <div className='my-3'> 3. If fundraising expires without goal being met, contributors appeal to get their refunds back.  </div>
        </div>
      </div>
      <div>
        {
          projects.map((project, index) => (
            <Link href={`/project/${project[2]}`} key={index}>
              <a>
                <div>
                  <p>{project[1]}</p>
                </div>
              </a>
            </Link>
          ))
        }
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