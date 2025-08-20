import { describe, it, expect, beforeEach } from "vitest";

interface Job {
  client: string;
  title: string;
  description: string;
  budget: bigint;
  milestones: { description: string; amount: bigint }[];
  deadline: bigint;
  status: bigint;
  createdAt: bigint;
}

interface Application {
  proposal: string;
  bid: bigint;
  appliedAt: bigint;
}

interface Agreement {
  freelancer: string;
  acceptedAt: bigint;
}

const mockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  jobCounter: 0n,
  maxApplicationsPerJob: 10n,
  jobs: new Map<string, Job>(),
  applications: new Map<string, Application>(),
  jobApplicants: new Map<string, string[]>(),
  agreements: new Map<string, Agreement>(),

  isAdmin(caller: string): boolean {
    return caller === this.admin;
  },

  transferAdmin(caller: string, newAdmin: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 112 };
    this.admin = newAdmin;
    return { value: true };
  },

  setMaxApplications(caller: string, max: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (max <= 0n) return { error: 106 };
    this.maxApplicationsPerJob = max;
    return { value: true };
  },

  createJob(
    caller: string,
    title: string,
    description: string,
    budget: bigint,
    milestones: { description: string; amount: bigint }[],
    deadline: bigint,
    currentBlockHeight: bigint
  ) {
    if (caller === "SP000000000000000000002Q6VF78") return { error: 112 };
    if (budget <= 0n) return { error: 107 };
    if (deadline <= currentBlockHeight) return { error: 108 };
    if (milestones.length === 0) return { error: 106 };
    const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0n);
    if (totalMilestoneAmount !== budget) return { error: 106 };

    const jobId = ++this.jobCounter;
    this.jobs.set(jobId.toString(), {
      client: caller,
      title,
      description,
      budget,
      milestones,
      deadline,
      status: 1n,
      createdAt: currentBlockHeight,
    });
    return { value: jobId };
  },

  applyToJob(jobId: bigint, freelancer: string, proposal: string, bid: bigint, currentBlockHeight: bigint) {
    const job = this.jobs.get(jobId.toString());
    if (!job) return { error: 101 };
    if (job.status !== 1n) return { error: 102 };
    if (currentBlockHeight >= job.deadline) return { error: 103 };
    const applicants = this.jobApplicants.get(jobId.toString()) || [];
    if (applicants.length >= this.maxApplicationsPerJob) return { error: 104 };
    if (this.applications.has(`${jobId}-${freelancer}`)) return { error: 105 };
    if (bid > job.budget) return { error: 107 };

    this.applications.set(`${jobId}-${freelancer}`, {
      proposal,
      bid,
      appliedAt: currentBlockHeight,
    });
    this.jobApplicants.set(jobId.toString(), [...applicants, freelancer]);
    return { value: true };
  },

  acceptApplication(caller: string, jobId: bigint, freelancer: string, currentBlockHeight: bigint) {
    const job = this.jobs.get(jobId.toString());
    if (!job) return { error: 101 };
    if (job.status !== 1n) return { error: 102 };
    if (job.client !== caller) return { error: 100 };
    if (!this.applications.has(`${jobId}-${freelancer}`)) return { error: 109 };

    this.jobs.set(jobId.toString(), { ...job, status: 3n });
    this.agreements.set(jobId.toString(), { freelancer, acceptedAt: currentBlockHeight });
    return { value: true };
  },

  closeJob(caller: string, jobId: bigint) {
    const job = this.jobs.get(jobId.toString());
    if (!job) return { error: 101 };
    if (job.status !== 1n) return { error: 102 };
    if (job.client !== caller) return { error: 100 };

    this.jobs.set(jobId.toString(), { ...job, status: 2n });
    return { value: true };
  },
};

describe("Job Listing Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.jobCounter = 0n;
    mockContract.maxApplicationsPerJob = 10n;
    mockContract.jobs.clear();
    mockContract.applications.clear();
    mockContract.jobApplicants.clear();
    mockContract.agreements.clear();
  });

  it("should allow admin to transfer admin rights", () => {
    const result = mockContract.transferAdmin(mockContract.admin, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.admin).toBe("ST2CY5...");
  });

  it("should prevent non-admin from transferring admin rights", () => {
    const result = mockContract.transferAdmin("ST2CY5...", "ST3NB...");
    expect(result).toEqual({ error: 100 });
  });

  it("should allow admin to set max applications", () => {
    const result = mockContract.setMaxApplications(mockContract.admin, 5n);
    expect(result).toEqual({ value: true });
    expect(mockContract.maxApplicationsPerJob).toBe(5n);
  });

  it("should allow client to create a job", () => {
    const result = mockContract.createJob(
      "ST2CY5...",
      "Web Developer Needed",
      "Build a decentralized app",
      1000000n,
      [{ description: "Complete frontend", amount: 500000n }, { description: "Complete backend", amount: 500000n }],
      1000n,
      500n
    );
    expect(result).toEqual({ value: 1n });
    expect(mockContract.jobs.get("1")).toEqual({
      client: "ST2CY5...",
      title: "Web Developer Needed",
      description: "Build a decentralized app",
      budget: 1000000n,
      milestones: [
        { description: "Complete frontend", amount: 500000n },
        { description: "Complete backend", amount: 500000n },
      ],
      deadline: 1000n,
      status: 1n,
      createdAt: 500n,
    });
  });

  it("should prevent creating job with invalid budget", () => {
    const result = mockContract.createJob(
      "ST2CY5...",
      "Invalid Job",
      "Invalid budget",
      0n,
      [{ description: "Invalid", amount: 0n }],
      1000n,
      500n
    );
    expect(result).toEqual({ error: 107 });
  });

  it("should prevent creating job with invalid deadline", () => {
    const result = mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      400n,
      500n
    );
    expect(result).toEqual({ error: 108 });
  });

  it("should allow freelancer to apply to job", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    const result = mockContract.applyToJob(1n, "ST3NB...", "Great proposal", 800000n, 600n);
    expect(result).toEqual({ value: true });
    expect(mockContract.applications.get("1-ST3NB...")).toEqual({
      proposal: "Great proposal",
      bid: 800000n,
      appliedAt: 600n,
    });
    expect(mockContract.jobApplicants.get("1")?.includes("ST3NB...")).toBe(true);
  });

  it("should prevent applying to closed job", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    mockContract.jobs.set("1", {
      ...mockContract.jobs.get("1")!,
      status: 2n,
    });
    const result = mockContract.applyToJob(1n, "ST3NB...", "Great proposal", 800000n, 600n);
    expect(result).toEqual({ error: 102 });
  });

  it("should prevent applying to expired job", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      500n,
      400n
    );
    const result = mockContract.applyToJob(1n, "ST3NB...", "Great proposal", 800000n, 600n);
    expect(result).toEqual({ error: 103 });
  });

  it("should prevent applying when limit reached", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    mockContract.jobApplicants.set("1", Array(10).fill("ST3NB..."));
    const result = mockContract.applyToJob(1n, "ST4RE...", "Great proposal", 800000n, 600n);
    expect(result).toEqual({ error: 104 });
  });

  it("should prevent duplicate applications", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    mockContract.applyToJob(1n, "ST3NB...", "Great proposal", 800000n, 600n);
    const result = mockContract.applyToJob(1n, "ST3NB...", "Duplicate proposal", 800000n, 600n);
    expect(result).toEqual({ error: 105 });
  });

  it("should allow client to accept application", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    mockContract.applyToJob(1n, "ST3NB...", "Great proposal", 800000n, 600n);
    const result = mockContract.acceptApplication("ST2CY5...", 1n, "ST3NB...", 600n);
    expect(result).toEqual({ value: true });
    expect(mockContract.agreements.get("1")).toEqual({
      freelancer: "ST3NB...",
      acceptedAt: 600n,
    });
    expect(mockContract.jobs.get("1")?.status).toBe(3n);
  });

  it("should prevent non-client from accepting application", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    mockContract.applyToJob(1n, "ST3NB...", "Great proposal", 800000n, 600n);
    const result = mockContract.acceptApplication("ST4RE...", 1n, "ST3NB...", 600n);
    expect(result).toEqual({ error: 100 });
  });

  it("should allow client to close job", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    const result = mockContract.closeJob("ST2CY5...", 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.jobs.get("1")?.status).toBe(2n);
  });

  it("should prevent non-client from closing job", () => {
    mockContract.createJob(
      "ST2CY5...",
      "Test Job",
      "Test description",
      1000000n,
      [{ description: "Test milestone", amount: 1000000n }],
      1000n,
      500n
    );
    const result = mockContract.closeJob("ST4RE...", 1n);
    expect(result).toEqual({ error: 100 });
  });
});