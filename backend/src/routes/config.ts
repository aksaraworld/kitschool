import express from 'express';
import Configuration from '../models/Configuration';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { UserRole } from '../models/User';
import { CONFIG_KEYS, DEFAULT_CONFIG, getConfig, setConfig, initializeDefaultConfig } from '../utils/config';

const router = express.Router();

// Initialize default configuration (run once)
router.post('/initialize', authenticate, authorize(UserRole.SAAS_ADMIN), async (req: AuthRequest, res) => {
  try {
    await initializeDefaultConfig();
    res.json({ message: 'Configuration initialized successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get all configurations (SaaS Admin only)
router.get('/', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const configs = await Configuration.find().sort({ key: 1 });
    
    // Include default values for missing configs
    const allConfigs = Object.entries(CONFIG_KEYS).map(([name, key]) => {
      const config = configs.find(c => c.key === key);
      return {
        key,
        name,
        value: config ? config.value : DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG],
        description: config?.description,
        type: config?.type || (typeof DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG] === 'number' ? 'number' : 'string'),
        updatedBy: config?.updatedBy,
        updatedAt: config?.updatedAt || new Date(),
        createdAt: config?.createdAt || new Date()
      };
    });

    res.json(allConfigs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get specific configuration
router.get('/:key', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const { key } = req.params;
    const config = await Configuration.findOne({ key });
    
    if (!config) {
      // Return default value if not found
      const defaultValue = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
      if (defaultValue !== undefined) {
        return res.json({
          key,
          value: defaultValue,
          type: typeof defaultValue === 'number' ? 'number' : typeof defaultValue === 'boolean' ? 'boolean' : typeof defaultValue === 'object' ? 'object' : 'string'
        });
      }
      return res.status(404).json({ message: 'Configuration not found' });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update configuration (SaaS Admin only)
router.put('/:key', authenticate, authorize(UserRole.SAAS_ADMIN), async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // Validate key exists in CONFIG_KEYS
    const validKeys = Object.values(CONFIG_KEYS);
    if (!validKeys.includes(key)) {
      return res.status(400).json({ message: 'Invalid configuration key' });
    }

    // Validate value based on key
    if (key === CONFIG_KEYS.ADMIN_FEE_PERCENTAGE || 
        key === CONFIG_KEYS.PAYMENT_GATEWAY_FEE_PERCENTAGE ||
        key === CONFIG_KEYS.PLATFORM_FEE_PERCENTAGE ||
        key === CONFIG_KEYS.TAX_PERCENTAGE) {
      if (typeof value !== 'number' || value < 0 || value > 100) {
        return res.status(400).json({ message: 'Percentage must be a number between 0 and 100' });
      }
    }

    if (key === CONFIG_KEYS.SUBSCRIPTION_FEE_PER_STUDENT) {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({ message: 'Subscription fee must be a positive number' });
      }
    }

    const config = await setConfig(key, value, req.user?.id);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get public configuration (admin fee percentage for display)
router.get('/public/admin-fee', async (req, res) => {
  try {
    const adminFeePercentage = await getConfig(CONFIG_KEYS.ADMIN_FEE_PERCENTAGE, DEFAULT_CONFIG[CONFIG_KEYS.ADMIN_FEE_PERCENTAGE]);
    res.json({ adminFeePercentage });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;


