import { BigNumber, utils as ethersUtils } from 'ethers'
import {
  IGetL2BridgeDefaults
} from './interfaces'
import {
  CHAIN_IDS,
  DEFAULT_MESSENGER_WRAPPER_GAS_LIMIT,
  DEFAULT_MESSENGER_WRAPPER_GAS_PRICE,
  DEFAULT_MESSENGER_WRAPPER_CALL_VALUE,
  DEFAULT_L2_BRIDGE_GAS_LIMIT,
  CHECKPOINT_MANAGER_ADDRESSES,
  FX_ROOT_ADDRESSES,
  FX_CHILD_ADDRESSES,
  POLYGON_RPC_ENDPOINTS,
  ERC20_PREDICATE_ADDRESSES,
  ERC20_MINTABLE_PREDICATE_ADDRESSES,
  AMB_PROXY_ADDRESSES
} from './constants'
import {
  goerliNetworkData
} from './networks/index'

export const getMessengerWrapperDefaults = (
  l1ChainId: BigNumber,
  l2ChainId: BigNumber,
  l1BridgeAddress: string,
  l2BridgeAddress: string,
  l1MessengerAddress: string,
  fxChildTunnelAddress: string,
  fxRootAddress: string = undefined
): any[] => {
  // Ending data to return
  let data: any = []

  // Defaults for most chains
  let defaults: any[] = [
    l1BridgeAddress,
    l2BridgeAddress,
    l1MessengerAddress
  ]

  if (isChainIdArbitrum(l2ChainId)) {
    const gasLimit: number = DEFAULT_MESSENGER_WRAPPER_GAS_LIMIT
    const gasPrice: number = DEFAULT_MESSENGER_WRAPPER_GAS_PRICE
    const callValue: number = DEFAULT_MESSENGER_WRAPPER_CALL_VALUE

    data.push(
      ...defaults,
      gasLimit,
      gasPrice,
      callValue
    )
  } else if (isChainIdOptimism(l2ChainId)) {
    const gasLimit: number = DEFAULT_MESSENGER_WRAPPER_GAS_LIMIT

    data.push(
      ...defaults,
      gasLimit
    )
  } else if (isChainIdXDai(l2ChainId)) {
    const gasLimit: number = 1000000
    const ambAddress: string = getXDaiAmbAddresses(l1ChainId)

    data.push(
      ...defaults,
      gasLimit,
      l2ChainId.toString(),
      ambAddress
    )
  } else if (isChainIdPolygon(l2ChainId)) {
    const checkpointManager: string = getPolygonCheckpointManagerAddress(l1ChainId)
    fxRootAddress = fxRootAddress || getPolygonFxRootAddress(l1ChainId)

    data.push(
      l1BridgeAddress,
      checkpointManager,
      fxRootAddress,
      fxChildTunnelAddress
    )
  }

  return data
}

export const getL2BridgeDefaults = (
  chainId: BigNumber,
  l2MessengerAddress: string,
  l2MessengerProxyAddress: string,
  governanceAddress: string,
  l2HopBridgeTokenAddress: string,
  l1BridgeAddress: string,
  activeChainIds: string[],
  bonderAddresses: string[],
  l1ChainId: BigNumber
): IGetL2BridgeDefaults[] => {
  let defaults: IGetL2BridgeDefaults[] = []

  let actualL2MessengerAddress: string = l2MessengerAddress
  let additionalData = []

  if (isChainIdArbitrum(chainId)) {
    // No additional data needed
  } else if (isChainIdOptimism(chainId)) {
    const defaultGasLimit = DEFAULT_L2_BRIDGE_GAS_LIMIT
    additionalData.push(defaultGasLimit)
  } else if (isChainIdXDai(chainId)) {
    additionalData.push(
      l1ChainId,
      DEFAULT_L2_BRIDGE_GAS_LIMIT
    )
  } else if (isChainIdPolygon(chainId)) {
    actualL2MessengerAddress = l2MessengerProxyAddress
  }

  defaults.push(
    actualL2MessengerAddress,
    governanceAddress,
    l2HopBridgeTokenAddress,
    l1BridgeAddress,
    activeChainIds,
    bonderAddresses
  )

  if (additionalData.length !== 0) {
    defaults.push(...additionalData)
  }

  return defaults
}

export const isChainIdOptimism = (chainId: BigNumber): boolean => {
  if (
    chainId.eq(CHAIN_IDS.OPTIMISM.TESTNET_1) ||
    chainId.eq(CHAIN_IDS.OPTIMISM.SYNTHETIX_DEMO) ||
    chainId.eq(CHAIN_IDS.OPTIMISM.HOP_TESTNET)
  ) {
    return true
  }

  return false
}

export const isChainIdArbitrum = (chainId: BigNumber): boolean => {
  if (
    chainId.eq(CHAIN_IDS.ARBITRUM.TESTNET_2) ||
    chainId.eq(CHAIN_IDS.ARBITRUM.TESTNET_3) ||
    chainId.eq(CHAIN_IDS.ARBITRUM.TESTNET_4)
  ) {
    return true
  }

  return false
}

export const isChainIdXDai = (chainId: BigNumber): boolean => {
  if (chainId.eq(CHAIN_IDS.XDAI.SOKOL) ||
      chainId.eq(CHAIN_IDS.XDAI.XDAI)
  ) {
    return true
  }

  return false
}

export const isChainIdPolygon = (chainId: BigNumber): boolean => {
  if (
    chainId.eq(CHAIN_IDS.POLYGON.MUMBAI) ||
    chainId.eq(CHAIN_IDS.POLYGON.POLYGON)
  ) {
    return true
  }

  return false
}

export const isChainIdMainnet = (chainId: BigNumber): boolean => {
  if (
    chainId.eq(CHAIN_IDS.ETHEREUM.MAINNET)
  ) {
    return true
  }

  return false
}

export const isChainIdGoerli = (chainId: BigNumber): boolean => {
  if (
    chainId.eq(CHAIN_IDS.ETHEREUM.GOERLI)
  ) {
    return true
  }

  return false
}

export const isChainIdKovan = (chainId: BigNumber): boolean => {
  if (
    chainId.eq(CHAIN_IDS.ETHEREUM.KOVAN)
  ) {
    return true
  }

  return false
}

export const isChainIdL1 = (chainId: BigNumber): boolean => {
  if (
    isChainIdMainnet(chainId) ||
    isChainIdGoerli(chainId) ||
    isChainIdKovan(chainId)
  ) {
    return true
  }

  return false
}

export const getXDaiAmbAddresses = (l1ChainId: BigNumber): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return AMB_PROXY_ADDRESSES.MAINNET
  } else if (isChainIdKovan(l1ChainId)) {
    return AMB_PROXY_ADDRESSES.KOVAN
  } else {
    throw new Error('Invalid Chain ID')
  }
}

// Create an array of strings for each supported chain ID
export const getAllActiveChainIds = (obj: any): string[] =>
  obj && obj instanceof Object
    ? Object.values(obj)
        .map(getAllActiveChainIds)
        .reduce((a: string[], b: any) => a.concat(b), [] as any[])
        .filter((a: any) => typeof a === 'string')
    : [obj]

export const getPolygonRpcEndpoint = (l1ChainId: BigNumber): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return POLYGON_RPC_ENDPOINTS.MAINNET
  } else if (isChainIdGoerli(l1ChainId)) {
    return POLYGON_RPC_ENDPOINTS.GOERLI
  } else {
    throw new Error('Invalid Chain ID')
  }
}

export const getPolygonCheckpointManagerAddress = (l1ChainId: BigNumber): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return CHECKPOINT_MANAGER_ADDRESSES.MAINNET
  } else if (isChainIdGoerli(l1ChainId)) {
    return CHECKPOINT_MANAGER_ADDRESSES.GOERLI
  } else {
    throw new Error('Invalid Chain ID')
  }
}

export const getPolygonFxRootAddress = (l1ChainId: BigNumber): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return FX_ROOT_ADDRESSES.MAINNET
  } else if (isChainIdGoerli(l1ChainId)) {
    return FX_ROOT_ADDRESSES.GOERLI
  } else {
    throw new Error('Invalid Chain ID')
  }
}

export const getPolygonFxChildAddress = (l1ChainId: BigNumber): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return FX_CHILD_ADDRESSES.MAINNET
  } else if (isChainIdGoerli(l1ChainId)) {
    return FX_CHILD_ADDRESSES.GOERLI
  } else {
    throw new Error('Invalid Chain ID')
  }
}

export const getPolygonPredicateContract = (l1ChainId: BigNumber, tokenAddress: string): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return getPolygonErc20PredicateAddress(l1ChainId)
  } else {
    // Polygon's testnet USDC non-mintable but all others are
    const polygonUSDCTestnetAddress: string = goerliNetworkData.mumbai.tokens.USDC.l1CanonicalTokenAddress
    if (tokenAddress === polygonUSDCTestnetAddress) {
      return getPolygonErc20PredicateAddress(l1ChainId)
    } else {
      return getPolygonMintableErc20PredicateAddress(l1ChainId)
    }
  }
}

const getPolygonErc20PredicateAddress = (l1ChainId: BigNumber): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return ERC20_PREDICATE_ADDRESSES.MAINNET
  } else if (isChainIdGoerli(l1ChainId)) {
    return ERC20_PREDICATE_ADDRESSES.GOERLI
  } else {
    throw new Error('Invalid Chain ID')
  }
}

const getPolygonMintableErc20PredicateAddress = (l1ChainId: BigNumber): string => {
  if (isChainIdMainnet(l1ChainId)) {
    return ERC20_MINTABLE_PREDICATE_ADDRESSES.MAINNET
  } else if (isChainIdGoerli(l1ChainId)) {
    return ERC20_MINTABLE_PREDICATE_ADDRESSES.GOERLI
  } else {
    throw new Error('Invalid Chain ID')
  }
}