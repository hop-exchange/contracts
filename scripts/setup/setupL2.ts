require('dotenv').config()

import {
  network,
  ethers,
  l2ethers as ovmEthers
} from 'hardhat'
import { BigNumber, ContractFactory, Contract, Signer } from 'ethers'

import { addAllSupportedChainIds, getContractFactories } from '../shared/utils'

import { DEFAULT_DEADLINE, LIQUIDITY_PROVIDER_UNISWAP_AMOUNT } from '../../config/constants'

async function setupL2 () {

  // Network setup
  const chainId: BigNumber = BigNumber.from(network.config.chainId)

  // Addresses
  const l2_canonicalTokenAddress: string = ''
  const l2_bridgeAddress: string = ''
  const uniswapRouterAddress: string = ''

  if (!l2_canonicalTokenAddress || !l2_bridgeAddress || !uniswapRouterAddress) {
    throw new Error('Addresses must be defined')
  }
  // Signers
  let accounts: Signer[]
  let owner: Signer
  let liquidityProvider: Signer

  // Factories
  let L2_MockERC20: ContractFactory
  let L2_Bridge: ContractFactory
  let UniswapRouter: ContractFactory

  // L2
  let l2_bridge: Contract
  let l2_canonicalToken: Contract
  let uniswapRouter: Contract

  // Instantiate the wallets
  accounts = await ethers.getSigners()
  owner = accounts[0]
  liquidityProvider = accounts[2]

  // Get the contract Factories
  ;({ 
    L2_MockERC20,
    L2_Bridge,
    UniswapRouter
  } = await getContractFactories(chainId, owner, ethers, ovmEthers))

  // Attach already deployed contracts
  l2_canonicalToken = L2_MockERC20.attach(l2_canonicalTokenAddress)

  l2_bridge = L2_Bridge.attach(l2_bridgeAddress)
  uniswapRouter = UniswapRouter.attach(uniswapRouterAddress)

  /**
   * Setup
   */

  // Add supported chain IDs
  await addAllSupportedChainIds(l2_bridge)

  // Additional transactions
  // NOTE: If a watcher is not set up to propagate transactions from L1 -> L2, then this mint is required to get the LP h tokens.
  // NOTE: Not to be used in production.
  await l2_bridge.connect(liquidityProvider).mint(await liquidityProvider.getAddress(), LIQUIDITY_PROVIDER_UNISWAP_AMOUNT)

  // Set up Uniswap
  await l2_canonicalToken.connect(liquidityProvider).approve(uniswapRouter.address, LIQUIDITY_PROVIDER_UNISWAP_AMOUNT)
  await l2_bridge.connect(liquidityProvider).approve(uniswapRouter.address, LIQUIDITY_PROVIDER_UNISWAP_AMOUNT)
  await uniswapRouter.connect(liquidityProvider).addLiquidity(
    l2_bridge.address,
    l2_canonicalToken.address,
    LIQUIDITY_PROVIDER_UNISWAP_AMOUNT,
    LIQUIDITY_PROVIDER_UNISWAP_AMOUNT,
    '0',
    '0',
    await liquidityProvider.getAddress(),
    DEFAULT_DEADLINE
  )
}

/* tslint:disable-next-line */
(async () => {
  await setupL2()
})()