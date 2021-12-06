import { JSBI, Token } from '@domgeswap-libs/sdk'
import React, { useCallback, useContext, useMemo, useState, useEffect } from 'react'
import { ThemeContext } from 'styled-components'
import { AutoColumn } from '../../components/Column'
import { AutoRow } from '../../components/Row'
import { SearchInput } from '../../components/SearchModal/styleds'
import { useAllTokenV1Exchanges } from '../../data/V1'
import { useActiveWeb3React } from '../../hooks'
import { useAllTokens, useToken } from '../../hooks/Tokens'
import { useSelectedTokenList } from '../../state/lists/hooks'
import { useTokenBalancesWithLoadingIndicator } from '../../state/wallet/hooks'
import { BackArrow, TYPE } from '../../components/Shared'
import { LightCard } from '../../components/Card'
import { BodyWrapper } from '../AppBody'
import { EmptyState } from './EmptyState'
import V1PositionCard from '../../components/PositionCard/V1'
import QuestionHelper from '../../components/QuestionHelper'
import { Dots } from '../../components/swap/styleds'
import { useAddUserToken } from '../../state/user/hooks'
import { isTokenOnList } from '../../utils'

const { mediumHeader: MediumHeader, body: Body } = TYPE

export default function MigrateV1() {
  const theme = useContext(ThemeContext)
  const { account, chainId } = useActiveWeb3React()

  const [tokenSearch, setTokenSearch] = useState<string>('')
  const handleTokenSearchChange = useCallback((e) => setTokenSearch(e.target.value), [setTokenSearch])

  // automatically add the search token
  const token = useToken(tokenSearch)
  const selectedTokenListTokens = useSelectedTokenList()
  const isOnSelectedList = isTokenOnList(selectedTokenListTokens, token ?? undefined)
  const allTokens = useAllTokens()
  const addToken = useAddUserToken()
  useEffect(() => {
    if (token && !isOnSelectedList && !allTokens[token.address]) {
      addToken(token)
    }
  }, [token, isOnSelectedList, addToken, allTokens])

  // get V1 LP balances
  const V1Exchanges = useAllTokenV1Exchanges()
  const V1LiquidityTokens: Token[] = useMemo(() => chainId
      ? Object.keys(V1Exchanges).map(
          (exchangeAddress) => new Token(chainId, exchangeAddress, 18, 'UNI-V1', 'Uniswap V1')
        )
      : [], [chainId, V1Exchanges])
  const [V1LiquidityBalances, V1LiquidityBalancesLoading] = useTokenBalancesWithLoadingIndicator(
    account ?? undefined,
    V1LiquidityTokens
  )
  const allV1PairsWithLiquidity = V1LiquidityTokens.filter((V1LiquidityToken) => {
    const balance = V1LiquidityBalances?.[V1LiquidityToken.address]
    return balance && JSBI.greaterThan(balance.raw, JSBI.BigInt(0))
  }).map((V1LiquidityToken) => {
    const balance = V1LiquidityBalances[V1LiquidityToken.address]
    return balance ? (
      <V1PositionCard
        key={V1LiquidityToken.address}
        token={V1Exchanges[V1LiquidityToken.address]}
        V1LiquidityBalance={balance}
      />
    ) : null
  })

  // should never always be false, because a V1 exhchange exists for WETH on all testnets
  const isLoading = Object.keys(V1Exchanges)?.length === 0 || V1LiquidityBalancesLoading

  return (
    <BodyWrapper>
      <AutoColumn gap="16px">
        <AutoRow style={{ alignItems: 'center', justifyContent: 'space-between' }} gap="8px">
          <BackArrow to="/pool" />
          <MediumHeader>Migrate V1 Liquidity</MediumHeader>
          <div>
            <QuestionHelper text="Migrate your liquidity tokens from Uniswap V1 to Uniswap V2." />
          </div>
        </AutoRow>

        <Body style={{ marginBottom: 8, fontWeight: 400 }}>
          For each pool shown below, click migrate to remove your liquidity from Uniswap V1 and deposit it into Uniswap
          V2.
        </Body>

        {!account ? (
          <LightCard padding="40px">
            <Body color={theme.colors.textDisabled} textAlign="center">
              Connect to a wallet to view your V1 liquidity.
            </Body>
          </LightCard>
        ) : isLoading ? (
          <LightCard padding="40px">
            <Body color={theme.colors.textDisabled} textAlign="center">
              <Dots>Loading</Dots>
            </Body>
          </LightCard>
        ) : (
          <>
            <AutoRow>
              <SearchInput
                value={tokenSearch}
                onChange={handleTokenSearchChange}
                placeholder="Enter a token address to find liquidity"
              />
            </AutoRow>
            {allV1PairsWithLiquidity?.length > 0 ? (
              <>{allV1PairsWithLiquidity}</>
            ) : (
              <EmptyState message="No V1 Liquidity found." />
            )}
          </>
        )}
      </AutoColumn>
    </BodyWrapper>
  )
}
