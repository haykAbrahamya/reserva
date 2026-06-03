import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './index'

// Typed versions of the plain react-redux hooks.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
