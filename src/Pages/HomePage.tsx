import React from 'react'
import Chart from "../components/Chart"
import Prices, { Input } from "../components/Input"
import { TokenProvider } from "../context/TokenContext";


const HomePage = () => {
  return (
    <div className='h-screen w-screen  items-center pt-20 bg-[hsl(0,0%,8%)] flex flex-col gap-5'>
      <TokenProvider>
        <Input/>
        <Chart/>
      </TokenProvider>
    </div>
  )
}

export default HomePage