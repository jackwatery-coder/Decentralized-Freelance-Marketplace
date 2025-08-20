;; Job Listing Contract
;; Clarity v2
;; Manages job postings, freelancer applications, and work agreements for a decentralized freelance marketplace

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-JOB-NOT-FOUND u101)
(define-constant ERR-JOB-CLOSED u102)
(define-constant ERR-JOB-EXPIRED u103)
(define-constant ERR-APPLICATION-LIMIT-REACHED u104)
(define-constant ERR-ALREADY-APPLIED u105)
(define-constant ERR-INVALID-MILESTONES u106)
(define-constant ERR-INVALID-BUDGET u107)
(define-constant ERR-INVALID-DEADLINE u108)
(define-constant ERR-NOT-APPLICANT u109)
(define-constant ERR-NO-APPLICATIONS u110)
(define-constant ERR-INVALID-CLIENT u111)
(define-constant ERR-ZERO-ADDRESS u112)

;; Job status constants
(define-constant STATUS-OPEN u1)
(define-constant STATUS-CLOSED u2)
(define-constant STATUS-ACTIVE u3)

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var job-counter uint u0)
(define-data-var max-applications-per-job uint u10)

;; Data structures
(define-map jobs
  { job-id: uint }
  {
    client: principal,
    title: (string-ascii 100),
    description: (string-ascii 1000),
    budget: uint, ;; in micro-STX
    milestones: (list 5 { description: (string-ascii 200), amount: uint }),
    deadline: uint, ;; block height
    status: uint,
    created-at: uint
  }
)

(define-map applications
  { job-id: uint, freelancer: principal }
  {
    proposal: (string-ascii 500),
    bid: uint, ;; in micro-STX
    applied-at: uint
  }
)

(define-map job-applicants
  { job-id: uint }
  (list 10 principal)
)

(define-map agreements
  { job-id: uint }
  { freelancer: principal, accepted-at: uint }
)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: is-valid-job (job-id)
(define-private (is-valid-job (job-id uint))
  (is-some (map-get? jobs { job-id: job-id }))
)

;; Private helper: is-job-open (job-id)
(define-private (is-job-open (job-id uint))
  (match (map-get? jobs { job-id: job-id })
    job (is-eq (get status job) STATUS-OPEN)
    false
  )
)

;; Private helper: has-applied (job-id freelancer)
(define-private (has-applied (job-id uint) (freelancer principal))
  (is-some (map-get? applications { job-id: job-id, freelancer: freelancer }))
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Set maximum applications per job
(define-public (set-max-applications (max uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> max u0) (err ERR-INVALID-MILESTONES))
    (var-set max-applications-per-job max)
    (ok true)
  )
)

;; Create a new job posting
(define-public (create-job
  (title (string-ascii 100))
  (description (string-ascii 1000))
  (budget uint)
  (milestones (list 5 { description: (string-ascii 200), amount: uint }))
  (deadline uint)
)
  (let
    (
      (job-id (+ (var-get job-counter) u1))
      (total-milestone-amount
        (fold + (map (lambda (m) (get amount m)) milestones) u0)
      )
    )
    (asserts! (not (is-eq tx-sender 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> budget u0) (err ERR-INVALID-BUDGET))
    (asserts! (is-eq total-milestone-amount budget) (err ERR-INVALID-MILESTONES))
    (asserts! (> deadline block-height) (err ERR-INVALID-DEADLINE))
    (asserts! (> (len milestones) u0) (err ERR-INVALID-MILESTONES))
    (map-set jobs
      { job-id: job-id }
      {
        client: tx-sender,
        title: title,
        description: description,
        budget: budget,
        milestones: milestones,
        deadline: deadline,
        status: STATUS-OPEN,
        created-at: block-height
      }
    )
    (var-set job-counter job-id)
    (ok job-id)
  )
)

;; Apply to a job
(define-public (apply-to-job (job-id uint) (proposal (string-ascii 500)) (bid uint))
  (let
    (
      (job (unwrap! (map-get? jobs { job-id: job-id }) (err ERR-JOB-NOT-FOUND)))
      (applicants (default-to (list) (map-get? job-applicants { job-id: job-id })))
    )
    (asserts! (is-job-open job-id) (err ERR-JOB-CLOSED))
    (asserts! (< block-height (get deadline job)) (err ERR-JOB-EXPIRED))
    (asserts! (< (len applicants) (var-get max-applications-per-job)) (err ERR-APPLICATION-LIMIT-REACHED))
    (asserts! (not (has-applied job-id tx-sender)) (err ERR-ALREADY-APPLIED))
    (asserts! (<= bid (get budget job)) (err ERR-INVALID-BUDGET))
    (map-set applications
      { job-id: job-id, freelancer: tx-sender }
      { proposal: proposal, bid: bid, applied-at: block-height }
    )
    (map-set job-applicants
      { job-id: job-id }
      (unwrap! (as-max-len? (append applicants tx-sender) (var-get max-applications-per-job)) (err ERR-APPLICATION-LIMIT-REACHED))
    )
    (ok true)
  )
)

;; Accept a freelancer's application
(define-public (accept-application (job-id uint) (freelancer principal))
  (let
    (
      (job (unwrap! (map-get? jobs { job-id: job-id }) (err ERR-JOB-NOT-FOUND)))
    )
    (asserts! (is-eq (get client job) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-job-open job-id) (err ERR-JOB-CLOSED))
    (asserts! (has-applied job-id freelancer) (err ERR-NOT-APPLICANT))
    (map-set jobs
      { job-id: job-id }
      (merge job { status: STATUS-ACTIVE })
    )
    (map-set agreements
      { job-id: job-id }
      { freelancer: freelancer, accepted-at: block-height }
    )
    (ok true)
  )
)

;; Close a job manually
(define-public (close-job (job-id uint))
  (let
    (
      (job (unwrap! (map-get? jobs { job-id: job-id }) (err ERR-JOB-NOT-FOUND)))
    )
    (asserts! (is-eq (get client job) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-job-open job-id) (err ERR-JOB-CLOSED))
    (map-set jobs
      { job-id: job-id }
      (merge job { status: STATUS-CLOSED })
    )
    (ok true)
  )
)

;; Read-only: get job details
(define-read-only (get-job (job-id uint))
  (ok (unwrap! (map-get? jobs { job-id: job-id }) (err ERR-JOB-NOT-FOUND)))
)

;; Read-only: get application details
(define-read-only (get-application (job-id uint) (freelancer principal))
  (ok (unwrap! (map-get? applications { job-id: job-id, freelancer: freelancer }) (err ERR-NOT-APPLICANT)))
)

;; Read-only: get job applicants
(define-read-only (get-job-applicants (job-id uint))
  (ok (default-to (list) (map-get? job-applicants { job-id: job-id })))
)

;; Read-only: get agreement
(define-read-only (get-agreement (job-id uint))
  (ok (map-get? agreements { job-id: job-id }))
)

;; Read-only: get job count
(define-read-only (get-job-count)
  (ok (var-get job-counter))
)

;; Read-only: get max applications
(define-read-only (get-max-applications)
  (ok (var-get max-applications-per-job))
)