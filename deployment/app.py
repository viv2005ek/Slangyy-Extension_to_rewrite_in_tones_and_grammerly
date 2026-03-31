import gradio as gr
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# --- Configuration ---
BASE_MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"
ADAPTER_REPO = "viv2005ek/phi-rewriter-adapter"

# --- Load Model & Tokenizer ---
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

    # Post‑processing to keep only the first coherent rewrite
    stop_patterns = [
        "Rewrite the following text", "---", "Original:", "Text:",
        "Revised Text:", "Corrected:", "**", "\n\n\n"
    ]
    stop_idx = len(generated)
    for pat in stop_patterns:
        idx = generated.find(pat)
        if idx != -1 and idx < stop_idx:
            stop_idx = idx
    generated = generated[:stop_idx]

    sections = generated.split("\n\n")
    if len(sections) > 1:
        first = sections[0].strip()
        if len(first) < 200 and any(sec.strip() and sec[0].isupper() for sec in sections[1:]):
            generated = first
        else:
            generated = "\n\n".join(sections)

    extra_cut = [
        "I'm doing well", "I'm good too", "Looking forward to it", "Me too, see you soon"
    ]
    for marker in extra_cut:
        idx = generated.find(marker)
        if idx != -1:
            generated = generated[:idx]
            break

    generated = generated.strip()
    if not generated:
        generated = "[Unable to rewrite]"

    return generated

# --- Create the Gradio Interface ---
with gr.Blocks(title="AI Text Rewriter") as demo:
    gr.Markdown(
        """
        # ✍️ Slangyy – AI Text Rewriter
        Rewrite any text in **professional**, **slangy**, **human** (natural), or **grammar‑checked** styles.
        Simply paste your text below, choose a style, and click **Rewrite**.
        """
    )

    with gr.Row():
        with gr.Column():
            input_text = gr.Textbox(label="Text to rewrite", lines=3, placeholder="Enter your text here...")
            style = gr.Dropdown(choices=["professional", "slangy", "human", "grammar"], label="Style")
            rewrite_btn = gr.Button("Rewrite")
        with gr.Column():
            output_text = gr.Textbox(label="Rewritten text", lines=5)

    rewrite_btn.click(
        fn=rewrite,
        inputs=[input_text, style],
        outputs=output_text
    )

    gr.Markdown(
        """
        ---
        ### 🚀 Use Slangyy as a Chrome Extension
        **Select any text on any webpage** → click the floating button → choose a style → get an instant rewrite with a copy button.  
        Perfect for emails, social media, or quick edits.

        🔗 **GitHub Repository**: [Slangyy Extension](https://github.com/viv2005ek/Slangyy-Extension_to_rewrite_in_tones_and_grammerly) – download and install it as your personal rewriter extension.

        📺 **Demo Video**: [Watch how it works](https://youtu.be/qiU4OSuuXTM)
        """
    )

# --- Launch ---
demo.launch(server_port=7860)