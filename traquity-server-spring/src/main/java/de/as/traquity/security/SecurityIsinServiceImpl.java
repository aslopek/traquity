package de.as.traquity.security;

import de.as.traquity.common.error.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class SecurityIsinServiceImpl implements SecurityIsinService {

  private final SecurityRepository securityRepository;

  @Override
  public String getIsin(long securityId) throws NotFoundException {
    return securityRepository.findById(securityId).orElseThrow(NotFoundException::new).getIsin();
  }
}
