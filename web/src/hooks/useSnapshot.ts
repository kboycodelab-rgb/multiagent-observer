import { useEffect } from 'react';
import { useStore } from '../store/team-store';

export function useSnapshot() {
  const setTeams = useStore((s) => s.setTeams);
  const setFileChanges = useStore((s) => s.setFileChanges);
  const setWorkspace = useStore((s) => s.setWorkspace);

  useEffect(() => {
    fetch('/api/snapshot')
      .then((r) => r.json())
      .then((data) => {
        setWorkspace(data.workspace);
        setTeams(data.teams);
        setFileChanges(data.fileChanges);
      })
      .catch((e) => console.error('[snapshot] fetch error', e));
  }, [setTeams, setFileChanges, setWorkspace]);
}
