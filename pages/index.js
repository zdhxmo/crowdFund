import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useContext } from 'react'
import { AccountContext } from '../context'
import { useRouter } from 'next/router'
import {
  contractAddress, platformAdmin
} from '../config'
import CrownFund from "../build/contracts/CrowdFund.json"
import { ethers } from 'ethers'

export default function Home({ projects }) {
  const account = useContext(AccountContext)

  // const router = useRouter()
  // async function navigate() {
  //   router.push('/create-post')
  // }
  console.log(projects)

  return (
    <div className='min-h-screen my-20'>
      <p>this test project only works with ropsten network </p>

      <div>
        {
          /* map over the posts array and render a button with the post title */
          projects.map((project, index) => (
            <Link href={`/project/${post[2]}`} key={index}>
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
  const contract = new ethers.Contract(contractAddress, CrownFund.abi, provider)
  const data = await contract.getAllProjects()
  return {
    props: {
      projects: JSON.parse(JSON.stringify(data))
    }
  }
}