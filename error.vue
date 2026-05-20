<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>();
const is404 = computed(() => props.error.statusCode === 404);

function back() {
    navigateTo("/");
}
</script>

<template>
    <div class="error-page">
        <div class="error-inner">
            <p class="error-code">{{ error.statusCode }}</p>
            <h1 class="error-title">
                {{ is404 ? "Страница не найдена" : "Что-то пошло не так" }}
            </h1>
            <p class="error-msg">
                {{
                    is404
                        ? "Возможно, страница была удалена или никогда не существовала."
                        : error.message
                }}
            </p>
            <button class="error-btn" @click="back()">← На главную</button>
        </div>
    </div>
</template>

<style>
body {
    background: #07070a;
    color: #e2ddd6;
    font-family: "Martian Mono", monospace;
}
</style>

<style scoped>
.error-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.error-inner {
    text-align: center;
    max-width: 480px;
}

.error-code {
    font-size: 120px;
    font-family: "Cormorant", serif;
    font-weight: 300;
    line-height: 1;
    color: rgba(240, 192, 96, 0.15);
    letter-spacing: -0.05em;
    margin-bottom: 24px;
}

.error-title {
    font-family: "Cormorant", serif;
    font-size: 32px;
    font-weight: 400;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
}

.error-msg {
    font-size: 13px;
    color: rgba(226, 221, 214, 0.5);
    margin-bottom: 40px;
    line-height: 1.7;
}

.error-btn {
    font-family: "Martian Mono", monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    color: #f0c060;
    border: 1px solid rgba(240, 192, 96, 0.3);
    padding: 12px 24px;
    background: transparent;
    cursor: pointer;
    transition:
        background 0.2s,
        color 0.2s;
}

.error-btn:hover {
    background: rgba(240, 192, 96, 0.1);
}
</style>
