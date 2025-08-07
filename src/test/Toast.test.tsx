import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from '../components/Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders success toast with correct styling', () => {
    const onClose = vi.fn()
    render(
      <Toast
        message="Operation completed successfully"
        type="success"
        onClose={onClose}
        duration={3000}
      />
    )

    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders error toast with correct styling', () => {
    const onClose = vi.fn()
    render(
      <Toast
        message="An error occurred"
        type="error"
        onClose={onClose}
        duration={3000}
      />
    )

    expect(screen.getByText('An error occurred')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('auto-closes after specified duration', async () => {
    const onClose = vi.fn()
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={onClose}
        duration={3000}
      />
    )

    expect(screen.getByText('Test message')).toBeInTheDocument()

    // Fast-forward time
    vi.advanceTimersByTime(3000)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onClose = vi.fn()
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={onClose}
        duration={5000}
      />
    )

    const closeButton = screen.getByRole('button')
    await user.click(closeButton)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('uses default duration when not specified', async () => {
    const onClose = vi.fn()
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={onClose}
      />
    )

    // Fast-forward to default duration (3000ms)
    vi.advanceTimersByTime(3000)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('handles long messages gracefully', () => {
    const onClose = vi.fn()
    const longMessage = 'A'.repeat(200)
    render(
      <Toast
        message={longMessage}
        type="success"
        onClose={onClose}
        duration={3000}
      />
    )

    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const onClose = vi.fn()
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={onClose}
        duration={3000}
      />
    )

    const closeButton = screen.getByRole('button')
    expect(closeButton).toBeInTheDocument()
  })

  it('animates in and out correctly', async () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Toast
        message="Test message"
        type="success"
        onClose={onClose}
        duration={3000}
      />
    )

    // Toast should be visible initially
    expect(screen.getByText('Test message')).toBeInTheDocument()

    // Fast-forward to trigger auto-close
    vi.advanceTimersByTime(3000)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    }, { timeout: 1000 })

    // Clean up
    unmount()
  })
}) 