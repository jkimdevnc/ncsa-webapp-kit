# Step plans

One file per workplan step (`step-NN.md`), holding the plan as approved before the step was built. It is the first
commit on the step's branch (Status "in progress"), so it can be read while the step is being built. Before the step
is verified, the last commit on the branch closes it out (Status "done", matching what the step delivered).

Once the step is merged, its file is final: later fixes and small changes don't update it. A new file is added only
when a new step is added to the workplan.

Each file has the same parts: **Context**, **What I build**, **How you verify**, and **Changes during the step** when
the plan changed. Steps 0–4 were rebuilt afterwards from the overview build plan, their commits and their PRs; each
of those files names its sources.

Why the design looks the way it does is in [`docs/decisions/`](../decisions/).
