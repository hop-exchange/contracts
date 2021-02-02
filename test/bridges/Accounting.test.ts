import '@nomiclabs/hardhat-waffle'
import { expect } from 'chai'
import { Signer, Contract, BigNumber } from 'ethers'

import { fixture } from '../shared/fixtures'
import { setUpDefaults } from '../shared/utils'
import { IFixture } from '../shared/interfaces'

import { CHAIN_IDS } from '../../config/constants'

describe("Accounting", () => {
  let _fixture: IFixture

  let bonder: Signer

  let mockAccounting: Contract

  beforeEach(async () => {
    const l2ChainId: BigNumber = CHAIN_IDS.OPTIMISM.TESTNET_1
    _fixture = await fixture(l2ChainId)
    await setUpDefaults(_fixture, l2ChainId)

    ;({ 
      bonder,
      mockAccounting
    } = _fixture);
  })

  /**
   * Happy Path
   */

  it('Should get the correct bonder address', async () => {
    const expectedBonderAddress = await mockAccounting.getBonder()
    const bonderAddress = await bonder.getAddress()
    expect(bonderAddress).to.eq(expectedBonderAddress)
  })

  it('Should get the correct credit', async () => {
    const expectedCredit = BigNumber.from(0)
    const credit = await mockAccounting.getCredit()
    expect(credit).to.eq(expectedCredit)
  })

  it('Should get the correct debit', async () => {
    const expectedDebit = BigNumber.from(0)
    const debit = await mockAccounting.getDebit()
    expect(debit).to.eq(expectedDebit)
  })

  it('Should stake and increase the credit', async () => {
    const stakeAmount = BigNumber.from(10)

    await mockAccounting.stake(stakeAmount)
    let credit = await mockAccounting.getCredit()
    let debit = await mockAccounting.getDebit()
    expect(credit).to.eq(stakeAmount)
    expect(debit).to.eq(0)

    await mockAccounting.stake(stakeAmount)
    credit = await mockAccounting.getCredit()
    debit = await mockAccounting.getDebit()
    expect(credit).to.eq(stakeAmount.mul(2))
    expect(debit).to.eq(0)
  })

  it('Should stake to increase the credit and subsequently unstake to increase the debit', async () => {
    const stakeAmount = BigNumber.from(10)

    await mockAccounting.stake(stakeAmount)
    let credit = await mockAccounting.getCredit()
    let debit = await mockAccounting.getDebit()
    expect(credit).to.eq(stakeAmount)
    expect(debit).to.eq(0)

    await mockAccounting.connect(bonder).unstake(stakeAmount)
    credit = await mockAccounting.getCredit()
    debit = await mockAccounting.getDebit()
    expect(credit).to.eq(stakeAmount)
    expect(debit).to.eq(stakeAmount)

    await mockAccounting.stake(stakeAmount.mul(2))
    credit = await mockAccounting.getCredit()
    debit = await mockAccounting.getDebit()
    expect(credit).to.eq(stakeAmount.mul(3))
    expect(debit).to.eq(stakeAmount)

    await mockAccounting.connect(bonder).unstake(stakeAmount)
    credit = await mockAccounting.getCredit()
    debit = await mockAccounting.getDebit()
    expect(credit).to.eq(stakeAmount.mul(3))
    expect(debit).to.eq(stakeAmount.mul(2))
  })

  /**
   * Non-Happy Path
   */

  it('Should not allow a higher debit than credit', async () => {
    const expectedError = 'ACT: Not enough available credit'
    const stakeAmount = BigNumber.from(10)

    await expect(
      mockAccounting.connect(bonder).unstake(stakeAmount)
    ).to.be.revertedWith(expectedError)
  })

  it('Should not allow someone outside of the bonder to unstake', async () => {
    const expectedError = 'ACT: Caller is not bonder'
    const stakeAmount = BigNumber.from(10)

    await mockAccounting.stake(stakeAmount)
    await expect(
      mockAccounting.unstake(stakeAmount)
    ).to.be.revertedWith(expectedError)
  })
})