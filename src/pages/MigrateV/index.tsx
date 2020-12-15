import { JSBI, Token } from '@kwikswap/sdk'
import React, { useCallback, useContext, useMemo, useState, useEffect } from 'react'
import { ThemeContext } from 'styled-components'
import { AutoColumn } from '../../components/Column'
import { AutoRow } from '../../components/Row'
import { SearchInput } from '../../components/SearchModal/styleds'
import { useAllTokenVExchanges } from '../../data/V'
import { useActiveWeb3React } from '../../hooks'
import { useAllTokens, useToken } from '../../hooks/Tokens'
import { useSelectedTokenList } from '../../state/lists/hooks'
import { useTokenBalancesWithLoadingIndicator } from '../../state/wallet/hooks'
import { BackArrow, TYPE } from '../../theme'
import { LightCard } from '../../components/Card'
import { BodyWrapper } from '../AppBody'
import { EmptyState } from './EmptyState'
import VPositionCard from '../../components/PositionCard/V'
import QuestionHelper from '../../components/QuestionHelper'
import { Dots } from '../../components/swap/styleds'
import { useAddUserToken } from '../../state/user/hooks'
import { isTokenOnList } from '../../utils'

export default function MigrateV() {
  const theme = useContext(ThemeContext)
  const { account, chainId } = useActiveWeb3React()

  const [tokenSearch, setTokenSearch] = useState<string>('')
  const handleTokenSearchChange = useCallback(e => setTokenSearch(e.target.value), [setTokenSearch])

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

  // get V LP balances
  const VExchanges = useAllTokenVExchanges()
  const VLiquidityTokens: Token[] = useMemo(() => {
    return chainId
      ? Object.keys(VExchanges).map(exchangeAddress => new Token(chainId, exchangeAddress, 18, 'KWIK', 'Kwikswap'))
      : []
  }, [chainId, VExchanges])
  const [VLiquidityBalances, VLiquidityBalancesLoading] = useTokenBalancesWithLoadingIndicator(
    account ?? undefined,
    VLiquidityTokens
  )
  const allVPairsWithLiquidity = VLiquidityTokens.filter(VLiquidityToken => {
    const balance = VLiquidityBalances?.[VLiquidityToken.address]
    return balance && JSBI.greaterThan(balance.raw, JSBI.BigInt(0))
  }).map(VLiquidityToken => {
    const balance = VLiquidityBalances[VLiquidityToken.address]
    return balance ? (
      <VPositionCard
        key={VLiquidityToken.address}
        token={VExchanges[VLiquidityToken.address]}
        VLiquidityBalance={balance}
      />
    ) : null
  })

  // should never always be false, because a V exhchange exists for WETH on all testnets
  const isLoading = Object.keys(VExchanges)?.length === 0 || VLiquidityBalancesLoading

  return (
    <BodyWrapper style={{ padding: 24 }}>
      <AutoColumn gap="16px">
        <AutoRow style={{ alignItems: 'center', justifyContent: 'space-between' }} gap="8px">
          <BackArrow to="/pool" />
          <TYPE.mediumHeader>Migrate V Liquidity</TYPE.mediumHeader>
          <div>
            <QuestionHelper text="Migrate your liquidity tokens from Kwikswap V to Kwikswap V1." />
          </div>
        </AutoRow>

        <TYPE.body style={{ marginBottom: 8, fontWeight: 400 }}>
          For each pool shown below, click migrate to remove your liquidity from Kwikswap V and deposit it into Kwikswap
          V1.
        </TYPE.body>

        {!account ? (
          <LightCard padding="40px">
            <TYPE.body color={theme.text3} textAlign="center">
              Connect to a wallet to view your V liquidity.
            </TYPE.body>
          </LightCard>
        ) : isLoading ? (
          <LightCard padding="40px">
            <TYPE.body color={theme.text3} textAlign="center">
              <Dots>Loading</Dots>
            </TYPE.body>
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
            {allVPairsWithLiquidity?.length > 0 ? (
              <>{allVPairsWithLiquidity}</>
            ) : (
              <EmptyState message="No V Liquidity found." />
            )}
          </>
        )}
      </AutoColumn>
    </BodyWrapper>
  )
}
