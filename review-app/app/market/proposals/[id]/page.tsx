import { findProposal, MOCK_PROPOSALS } from '@/lib/proposal-detail-mocks'
import { ProposalShell } from '@/components/proposal-detail/ProposalShell'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposal = findProposal(id) || MOCK_PROPOSALS[0]
  return <ProposalShell proposal={proposal} proposalId={id} />
}
