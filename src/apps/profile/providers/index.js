// Profile data aggregator — calls each source app's summary() in parallel.
// Never imports tab components; only the named summary export from each app.
import { summary as rewardsSummary } from '../../../lib/rewards'
import { summary as questSummary }   from '../../quest'
import { summary as fitnessSummary } from '../../fitness'
import { summary as journalSummary } from '../../journal'
import { summary as ledgerSummary }  from '../../ledger'

export async function loadAll(member, now = new Date()) {
  const [rewards, quest, fitness, journal, ledger] = await Promise.allSettled([
    rewardsSummary({ member, now }),
    questSummary({ member, now }),
    fitnessSummary({ member, now }),
    journalSummary({ member, now }),
    ledgerSummary({ member, now }),
  ])
  return {
    rewards: rewards.status === 'fulfilled' ? rewards.value : null,
    quest:   quest.status   === 'fulfilled' ? quest.value   : null,
    fitness: fitness.status === 'fulfilled' ? fitness.value : null,
    journal: journal.status === 'fulfilled' ? journal.value : null,
    ledger:  ledger.status  === 'fulfilled' ? ledger.value  : null,
  }
}
