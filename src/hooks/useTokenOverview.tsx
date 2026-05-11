// import { useQuery } from "@tanstack/react-query";
// import { getTokenOverview } from "../services/getTokenOverview";
// import { useToken } from "../context/TokenContext";

// export const useTokenOverview = () => {
//   const { tokenAddress, polling } = useToken();

//   return useQuery({
//     queryKey: ["tokenOverview", tokenAddress],
//     queryFn: () => getTokenOverview(tokenAddress),
//     enabled: !!tokenAddress,

//     // polling every 5 mins
//     refetchInterval: polling ? 300000 : false,

//     // avoids extra API calls when refocusing tab
//     refetchOnWindowFocus: false,

//     // stop polling in inactive tabs
//     refetchIntervalInBackground: false,

//     // cache freshness
//     staleTime: 30000,
//   });
// };