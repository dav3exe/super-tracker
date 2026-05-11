import React from 'react'
import Chart from "../components/Chart"
import Prices, { Input } from "../components/Input"
import { TokenProvider } from "../context/TokenContext";
import TopHolders from '../components/TopHolders';


const HomePage = () => {
  return (
    <div className='hide-scrollbar min-h-screen w-screen items-center bg-[hsl(0,0%,8%)] flex flex-col gap-5 overflow-scroll '>
      <TokenProvider>
        <Input/>
        <Chart/>
        <TopHolders/>
      </TokenProvider>
    </div>
  )
}

export default HomePage