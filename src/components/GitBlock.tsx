import type { GitMeta, GitProvider } from '../types'
import { gitMetaUrls } from '../types'
import { ExternalLink, GitBranch, GitCommit, GitPullRequest, CircleDot } from 'lucide-react'

interface Props {
  git: GitMeta
  onChange: (git: GitMeta) => void
}

const PROVIDERS: GitProvider[] = ['github', 'gitlab', 'bitbucket', 'other']

export function GitBlock({ git, onChange }: Props) {
  const patch = (partial: Partial<GitMeta>) => onChange({ ...git, ...partial })
  const urls = gitMetaUrls(git)

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--color-border)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-hover)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--color-muted)]">Git</span>
        <select
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-xs outline-none"
          value={git.provider}
          onChange={(e) => patch({ provider: e.target.value as GitProvider })}
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 font-mono text-sm outline-none"
          value={git.repo}
          placeholder="owner/repo"
          onChange={(e) => patch({ repo: e.target.value })}
        />
        <a
          href={urls.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-accent)] hover:bg-[var(--color-panel)]"
        >
          <ExternalLink size={12} /> 열기
        </a>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2">
        <Field
          icon={<GitBranch size={14} />}
          label="Branch"
          value={git.branch}
          onChange={(branch) => patch({ branch })}
          href={urls.branchUrl}
        />
        <Field
          icon={<GitPullRequest size={14} />}
          label="PR / MR #"
          value={git.pr}
          onChange={(pr) => patch({ pr })}
          href={urls.prUrl}
          placeholder="123"
        />
        <Field
          icon={<CircleDot size={14} />}
          label="Issue #"
          value={git.issue}
          onChange={(issue) => patch({ issue })}
          href={urls.issueUrl}
          placeholder="45"
        />
        <Field
          icon={<GitCommit size={14} />}
          label="Commit"
          value={git.commit}
          onChange={(commit) => patch({ commit })}
          href={urls.commitUrl}
          placeholder="abc1234"
        />
      </div>

      <div className="border-t border-[var(--color-border)] px-3 py-2">
        <input
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
          value={git.note}
          placeholder="메모 (배포 메모, 리뷰 포인트…)"
          onChange={(e) => patch({ note: e.target.value })}
        />
      </div>
    </div>
  )
}

function Field({
  icon,
  label,
  value,
  onChange,
  href,
  placeholder,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  href?: string | null
  placeholder?: string
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5">
      <span className="text-[var(--color-muted)]">{icon}</span>
      <span className="w-16 shrink-0 text-[11px] text-[var(--color-muted)]">{label}</span>
      <input
        className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {href && value && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-accent)]"
          title="열기"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </label>
  )
}
