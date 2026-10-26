import '../types/express.js'
import { getAuth } from '@clerk/express'
import User from '../models/User.js'
import type { NextFunction, Request, Response } from 'express'

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req)

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized',
            })
        }

        const user = await User.findOne({ clerkId: userId })

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        req.user = user
        next()
    } catch (error) {
        console.error('Auth error:', error)
        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
        })
    }
}

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'User role is not authorized to access this route',
            })
        }

        next()
    }
}