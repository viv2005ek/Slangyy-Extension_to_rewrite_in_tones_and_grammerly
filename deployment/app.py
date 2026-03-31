import gradio as gr
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# --- Configuration ---
BASE_MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"
ADAPTER_REPO = "viv2005ek/phi-rewriter-adapter"  # Your public adapter repo

# --- Load Model & Tokenizer (cached on first Space start) ---
print("Loading base model...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)

base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto"
)

print("Loading LoRA adapter...")
model = PeftModel.from_pretrained(base_model, ADAPTER_REPO)

# --- Core Rewrite Function ---
def rewrite(text, style):
    style_map = {
        "professional": "Rewrite the following text in a professional style.",
        "slangy": "Rewrite the following text in a slangy style.",
        "human": "Rewrite the following text to sound human and natural.",
        "grammar": "Rewrite the following text to correct grammar errors."
    }
    instruction = style_map[style]
    prompt = f"<|user|>\n{instruction}\n{text}\n<|assistant|>\n"

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=256,           # enough for a detailed rewrite
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.eos_token_id,
        do_sample=False
    )

    # Decode only the newly generated part
    generated = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)

    # 1. Remove any trailing content after a new instruction pattern
    stop_patterns = [
        "Rewrite the following text",
        "---",
        "Original:",
        "Text:",
        "Revised Text:",
        "Corrected:",
        "**",
        "\n\n\n"  # triple newline often separates unrelated blocks
    ]
    stop_idx = len(generated)
    for pat in stop_patterns:
        idx = generated.find(pat)
        if idx != -1 and idx < stop_idx:
            stop_idx = idx
    generated = generated[:stop_idx]

    # 2. If there are multiple sections separated by double newline,
    #    decide whether to keep all or only the first.
    sections = generated.split("\n\n")
    if len(sections) > 1:
        # Check if the first section looks like a complete rewrite
        first = sections[0].strip()
        # If the first section is very short (like a single sentence) and
        # the second section starts with a capital letter and is a full sentence,
        # it's likely a list of alternatives. Keep only the first.
        if len(first) < 200 and any(sec.strip() and sec[0].isupper() for sec in sections[1:]):
            generated = first
        else:
            # Otherwise, keep all sections (they are probably part of one rewrite)
            generated = "\n\n".join(sections)

    # 3. If the result still contains obvious extra markers (like "I'm doing well"),
    #    we can apply a final safety cut.
    extra_cut = [
        "I'm doing well",
        "I'm good too",
        "Looking forward to it",
        "Me too, see you soon"
    ]
    for marker in extra_cut:
        idx = generated.find(marker)
        if idx != -1:
            generated = generated[:idx]
            break

    # Clean up trailing whitespace and ensure we have something
    generated = generated.strip()
    if not generated:
        generated = "[Unable to rewrite]"

    return generated
    style_map = {
        "professional": "Rewrite the following text in a professional style.",
        "slangy": "Rewrite the following text in a slangy style.",
        "human": "Rewrite the following text to sound human and natural.",
        "grammar": "Rewrite the following text to correct grammar errors."
    }
    instruction = style_map.get(style, style_map["professional"])
    prompt = f"<|user|>\n{instruction}\n{text}\n<|assistant|>\n"

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.eos_token_id,
            do_sample=False
        )

    generated = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)

    # --- Post-processing to keep only the first rewrite ---
    stop_patterns = [
        "Rewrite the following text", "---", "Original:", "Text:",
        "Revised Text:", "Corrected:", "**"
    ]
    stop_idx = len(generated)
    for pat in stop_patterns:
        idx = generated.find(pat)
        if idx != -1 and idx < stop_idx:
            stop_idx = idx
    generated = generated[:stop_idx]

    return generated.strip() or "[Unable to rewrite]"

# --- Create the Gradio Interface ---
demo = gr.Interface(
    fn=rewrite,
    inputs=[
        gr.Textbox(label="Text to rewrite", lines=3, placeholder="Enter your text here..."),
        gr.Dropdown(choices=["professional", "slangy", "human", "grammar"], label="Style")
    ],
    outputs=gr.Textbox(label="Rewritten text", lines=5),
    title="AI Text Rewriter",
    description="Rewrite your text in professional, slangy, human, or grammar-checked styles."
)

# --- Launch the App ---
demo.launch(server_port=7860)