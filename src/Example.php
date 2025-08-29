<?php

namespace MemoryLink;

class Example
{
    private string $message;

    public function __construct(string $message = 'Hello from MemoryLink CMS!')
    {
        $this->message = $message;
    }

    public function getMessage(): string
    {
        return $this->message;
    }

    public function setMessage(string $message): void
    {
        $this->message = $message;
    }

    public function display(): void
    {
        echo $this->message . PHP_EOL;
    }
}
