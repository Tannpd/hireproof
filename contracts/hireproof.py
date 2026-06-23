# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# =============================================================================
#  hireproof.py — Decentralized AI Headhunter & Soft Skills Verification
#  GenLayer Intelligent Contract (v0.2.16)
# =============================================================================

from genlayer import *
import json

class Contract(gl.Contract):
    """
    HireProof — Bias-free recruitment bounty platform
    ===================================================
    Holds sign-on bounties deposited by companies. Runs blind AI evaluations
    on applicant interview transcripts based on qualitative HR rubrics.
    Consensuses on passing applicants and releases payments automatically.
    """

    # Monotonic bounty counter
    bounties_count:           u64

    # State mappings
    bounty_creator:            TreeMap[u64, Address]
    bounty_amount:             TreeMap[u64, u256]
    bounty_rubric:             TreeMap[u64, str]
    bounty_status:             TreeMap[u64, str]      # "ACTIVE", "FILLED", "CANCELLED"
    bounty_applicant:          TreeMap[u64, Address]  # Winner or latest applicant
    bounty_transcript_url:     TreeMap[u64, str]
    bounty_eq_score:           TreeMap[u64, u64]
    bounty_logic_score:        TreeMap[u64, u64]
    bounty_feedback:           TreeMap[u64, str]

    # ═══════════════════════════════════════════════════════════════════
    # CONSTRUCTOR
    # ═══════════════════════════════════════════════════════════════════
    def __init__(self) -> None:
        """
        Constructor. Standard GenLayer initialization.
        Note: TreeMaps are pre-initialized by the VM and must not be assigned here.
        """
        self.bounties_count = 0

    # ═══════════════════════════════════════════════════════════════════
    # PUBLIC METHOD: CREATE JOB BOUNTY
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def create_bounty(self, rubric: str) -> int:
        """
        Companies call this to create a Job Bounty, deposit native GEN tokens
        as a sign-on bonus, and define a strict soft-skills HR rubric.
        """
        if len(rubric.strip()) == 0:
            raise UserError("HR rubric cannot be empty.")

        bounty_val = int(gl.message.value)
        if bounty_val <= 0:
            raise UserError("You must deposit a positive GEN bounty amount.")

        bid = self.bounties_count

        self.bounty_creator[bid]          = gl.message.sender_address
        self.bounty_amount[bid]           = bounty_val
        self.bounty_rubric[bid]           = rubric.strip()
        self.bounty_status[bid]           = "ACTIVE"
        self.bounty_applicant[bid]        = Address("0x0000000000000000000000000000000000000000")
        self.bounty_transcript_url[bid]   = ""
        self.bounty_eq_score[bid]         = 0
        self.bounty_logic_score[bid]      = 0
        self.bounty_feedback[bid]         = "No applications submitted yet."

        self.bounties_count = int(bid) + 1
        return int(bid)

    # ═══════════════════════════════════════════════════════════════════
    # PUBLIC METHOD: APPLY FOR JOB BOUNTY (AI EVALUATION)
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def apply_for_bounty(self, bounty_id: int, transcript_url: str) -> None:
        """
        Applicants call this to submit their interview/situational answers.
        Triggers the AI evaluation and releases payment if applicant passes.
        """
        if bounty_id < 0 or bounty_id >= int(self.bounties_count):
            raise UserError("Bounty does not exist.")

        status = self.bounty_status.get(bounty_id, "ACTIVE")
        if status != "ACTIVE":
            raise UserError("This job bounty is no longer active.")

        if len(transcript_url.strip()) == 0:
            raise UserError("Transcript URL cannot be empty.")

        rubric = self.bounty_rubric.get(bounty_id, "")
        applicant = gl.message.sender_address

        # ── Non-Deterministic Evaluation Block ────────────────────────
        def leader_fn() -> str:
            # 1. Fetch transcript text from URL
            try:
                page_text: str = gl.nondet.web.render(transcript_url)
            except Exception as render_err:
                return json.dumps({
                    "error": f"URL_FETCH_FAILED: {str(render_err)}",
                    "verdict": "FAILED",
                    "eq_score": 0,
                    "logic_score": 0,
                    "feedback": f"Could not render the transcript URL: {str(render_err)}"
                })

            content = page_text.strip()
            if len(content) < 50:
                return json.dumps({
                    "error": "CONTENT_TOO_SHORT",
                    "verdict": "FAILED",
                    "eq_score": 0,
                    "logic_score": 0,
                    "feedback": "The submitted URL returned insufficient content for evaluation."
                })

            # Truncate content to fit LLM window safely
            truncated_content = content[:5000]

            # 2. Instruct LLM to act as a blind HR Director
            prompt = f"""You are a blind, objective HR Director. Ignore the applicant's name, gender, formatting, or background. Focus solely on their empathy, logic, and problem-solving approach.
Your job is to evaluate the applicant's situational interview transcript or essay answers based on the following specific HR rubric:
--- HR RUBRIC ---
{rubric}
--- END HR RUBRIC ---

Applicant's transcript/essay content:
--- CONTENT START ---
{truncated_content}
--- CONTENT END ---

Please evaluate the applicant on:
1. Empathy / EQ: How well do they understand interpersonal dynamics, show emotional intelligence, and exhibit a team-first attitude? (Score 0-100)
2. Logic / Critical Thinking: How structured, logical, and robust is their crisis-solving or problem-solving approach? (Score 0-100)
3. Rubric Alignment: Do they satisfy the specific criteria listed in the HR Rubric?

Determine the final verdict:
- "PASSED": The applicant demonstrates strong EQ, logic, and satisfies the HR Rubric criteria.
- "FAILED": The applicant's response is weak, lacks critical thinking/empathy, or does not satisfy the rubric.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this schema. Do not wrap in markdown code blocks (e.g. ```json), do not write explanation text outside the JSON.
{{
  "verdict": "PASSED" | "FAILED",
  "eq_score": <int>,
  "logic_score": <int>,
  "feedback": "<A detailed 2-3 sentence analysis of their soft skills and why they passed/failed>"
}}"""

            # Run LLM
            raw_output = gl.nondet.exec_prompt(prompt)

            # Clean markdown code blocks if any
            cleaned = raw_output.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                inner_lines = []
                for line in lines[1:]:
                    if line.strip() == "```":
                        break
                    inner_lines.append(line)
                cleaned = "\n".join(inner_lines).strip()

            try:
                parsed = json.loads(cleaned)
                verdict = str(parsed.get("verdict", "FAILED")).strip().upper()
                if verdict not in ["PASSED", "FAILED"]:
                    verdict = "FAILED"
                eq_score = int(parsed.get("eq_score", 0))
                logic_score = int(parsed.get("logic_score", 0))
                feedback = str(parsed.get("feedback", "No feedback provided.")).strip()

                return json.dumps({
                    "verdict": verdict,
                    "eq_score": eq_score,
                    "logic_score": logic_score,
                    "feedback": feedback[:1000]
                })
            except Exception as parse_err:
                return json.dumps({
                    "error": f"JSON_PARSE_FAILED: {str(parse_err)}",
                    "verdict": "FAILED",
                    "eq_score": 0,
                    "logic_score": 0,
                    "feedback": "AI HR Director response formatting error. Evaluation failed."
                })

        def validator_fn(leader_result: str) -> bool:
            """
            Semantic HR Consensus. Compares the final verdict (PASSED/FAILED)
            to reach consensus, even if exact scores/feedback details differ.
            """
            try:
                leader_data = json.loads(leader_result)
            except Exception:
                return False

            if "error" in leader_data:
                allowed_errors = {"URL_FETCH_FAILED", "CONTENT_TOO_SHORT", "JSON_PARSE_FAILED"}
                return any(err in str(leader_data.get("error", "")) for err in allowed_errors)

            validator_raw = leader_fn()
            try:
                validator_data = json.loads(validator_raw)
            except Exception:
                return True  # Agree/abstain if validator node faces a local error

            if "error" in validator_data:
                return True  # Abstain if validator gets network error

            leader_verdict = str(leader_data.get("verdict", "")).strip().upper()
            validator_verdict = str(validator_data.get("verdict", "")).strip().upper()

            # Semantic agreement check on final binary outcome
            return leader_verdict == validator_verdict

        # Run Consensus Protocol
        consensus_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        try:
            res = json.loads(consensus_json)
        except Exception:
            # Consensus failed or output is unparseable
            self.bounty_feedback[bounty_id] = "AI consensus failed due to unparseable evaluation results."
            return

        verdict     = str(res.get("verdict", "FAILED")).strip().upper()
        eq_score    = int(res.get("eq_score", 0))
        logic_score = int(res.get("logic_score", 0))
        feedback    = str(res.get("feedback", "Evaluation finished."))

        # Update evaluation results in state
        self.bounty_applicant[bounty_id]        = applicant
        self.bounty_transcript_url[bounty_id]   = transcript_url
        self.bounty_eq_score[bounty_id]         = eq_score
        self.bounty_logic_score[bounty_id]      = logic_score
        self.bounty_feedback[bounty_id]         = feedback

        if verdict == "PASSED":
            bounty_val = int(self.bounty_amount.get(bounty_id, 0))
            
            # Reset bounty balance first to prevent double-claim re-entrancy
            self.bounty_amount[bounty_id] = 0
            self.bounty_status[bounty_id] = "FILLED"

            # Release payout to passing applicant
            other = gl.get_contract_at(applicant)
            other.emit_transfer(value=u256(bounty_val))
        else:
            # Bounty remains ACTIVE so other candidates can apply
            self.bounty_status[bounty_id] = "ACTIVE"

    # ═══════════════════════════════════════════════════════════════════
    # PUBLIC METHOD: CANCEL BOUNTY
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def cancel_bounty(self, bounty_id: int) -> None:
        """
        Allows the company creator to cancel their bounty and refund locked GEN tokens,
        provided the bounty has not been filled.
        """
        if bounty_id < 0 or bounty_id >= int(self.bounties_count):
            raise UserError("Bounty does not exist.")

        status = self.bounty_status.get(bounty_id, "ACTIVE")
        if status != "ACTIVE":
            raise UserError("Bounty cannot be cancelled in its current state.")

        creator = self.bounty_creator.get(bounty_id, Address("0x0000000000000000000000000000000000000000"))
        if gl.message.sender_address != creator:
            raise UserError("Only the company that created this bounty can cancel it.")

        bounty_val = int(self.bounty_amount.get(bounty_id, 0))
        if bounty_val <= 0:
            raise UserError("No funds locked.")

        # Zero out the amount and mark as cancelled
        self.bounty_amount[bounty_id] = 0
        self.bounty_status[bounty_id] = "CANCELLED"
        self.bounty_feedback[bounty_id] = "Bounty cancelled and refunded to creator."

        # Refund to company
        other = gl.get_contract_at(creator)
        other.emit_transfer(value=u256(bounty_val))

    # ═══════════════════════════════════════════════════════════════════
    # READ-ONLY VIEW METHODS
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.view
    def get_bounty_count(self) -> int:
        """
        Returns the total number of bounties created.
        """
        return int(self.bounties_count)

    @gl.public.view
    def get_bounty(self, bounty_id: int) -> str:
        """
        Returns a JSON-serialized representation of a bounty.
        """
        if bounty_id < 0 or bounty_id >= int(self.bounties_count):
            raise UserError("Bounty does not exist.")

        creator   = self.bounty_creator.get(bounty_id, Address("0x0000000000000000000000000000000000000000"))
        applicant = self.bounty_applicant.get(bounty_id, Address("0x0000000000000000000000000000000000000000"))

        return json.dumps({
            "id": bounty_id,
            "creator": str(creator),
            "amount": int(self.bounty_amount.get(bounty_id, 0)),
            "rubric": self.bounty_rubric.get(bounty_id, ""),
            "status": self.bounty_status.get(bounty_id, "ACTIVE"),
            "applicant": str(applicant),
            "transcript_url": self.bounty_transcript_url.get(bounty_id, ""),
            "eq_score": int(self.bounty_eq_score.get(bounty_id, 0)),
            "logic_score": int(self.bounty_logic_score.get(bounty_id, 0)),
            "feedback": self.bounty_feedback.get(bounty_id, "")
        })
